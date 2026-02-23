const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

/**
 * Enhanced security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy for API endpoints
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Security-Policy', "default-src 'self'");
  }
  
  next();
};

/**
 * IP whitelist middleware for sensitive endpoints
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    
    if (allowedIPs.length === 0) {
      return next(); // No whitelist configured
    }
    
    if (!allowedIPs.includes(clientIP)) {
      logger.warn('Unauthorized IP access attempt', {
        ip: clientIP,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied from this IP address'
      });
    }
    
    next();
  };
};

/**
 * Request size limiter for different endpoints
 */
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          success: false,
          message: `Request size too large. Maximum allowed: ${maxSize}`
        });
      }
    }
    
    next();
  };
};

/**
 * Helper function to parse size strings (e.g., '10mb' -> bytes)
 */
const parseSize = (size) => {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
  
  if (!match) {
    throw new Error('Invalid size format');
  }
  
  const [, value, unit] = match;
  return Math.floor(parseFloat(value) * units[unit]);
};

/**
 * Suspicious activity detector
 */
const suspiciousActivityDetector = (req, res, next) => {
  const suspiciousPatterns = [
    /\.\./,           // Directory traversal
    /<script/i,       // XSS attempts
    /javascript:/i,   // JavaScript protocol
    /data:/i,         // Data protocol
    /vbscript:/i,     // VBScript protocol
    /onload=/i,       // Event handlers
    /onerror=/i       // Event handlers
  ];
  
  const checkSuspicious = (obj) => {
    if (typeof obj === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkSuspicious(value));
    }
    
    return false;
  };
  
  // Check various parts of the request
  const suspiciousIn = [
    checkSuspicious(req.query),
    checkSuspicious(req.body),
    checkSuspicious(req.params),
    checkSuspicious(req.headers)
  ];
  
  if (suspiciousIn.some(isSuspicious => isSuspicious)) {
    logger.warn('Suspicious activity detected', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      query: req.query,
      body: req.body,
      params: req.params
    });
    
    return res.status(400).json({
      success: false,
      message: 'Suspicious activity detected'
    });
  }
  
  next();
};

/**
 * Rate limiting for sensitive operations
 */
const sensitiveRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many attempts. Please try again later.'
    });
  }
});

/**
 * API key authentication for service endpoints
 */
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey) {
    return next(); // No API key configured
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    logger.warn('Invalid API key attempt', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }
  
  next();
};

/**
 * Request timeout middleware
 */
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          timeout: timeoutMs
        });
        
        res.status(408).json({
          success: false,
          message: 'Request timeout'
        });
      }
    }, timeoutMs);
    
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    
    next();
  };
};

module.exports = {
  securityHeaders,
  ipWhitelist,
  requestSizeLimiter,
  suspiciousActivityDetector,
  sensitiveRateLimit,
  apiKeyAuth,
  requestTimeout
};
