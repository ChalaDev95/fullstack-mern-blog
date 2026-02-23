const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const cors = require('cors');
const express = require('express');
const { requestLogger } = require('../utils/logger');
const { generalLimiter, authLimiter } = require('./rateLimiter');
const { 
  securityHeaders, 
  suspiciousActivityDetector, 
  requestTimeout,
  requestSizeLimiter 
} = require('./security');

/**
 * Security middleware configuration
 */
const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:']
      }
    },
    crossOriginEmbedderPolicy: false
  }),
  mongoSanitize(),
  compression(),
  securityHeaders,
  suspiciousActivityDetector,
  requestTimeout(30000), // 30 second timeout
  requestSizeLimiter('10mb')
];

/**
 * CORS middleware configuration
 */
const corsMiddleware = cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
});

/**
 * Rate limiting middleware configuration
 */
const rateLimitMiddleware = [
  { path: '/api/', limiter: generalLimiter },
  { path: '/api/auth/login', limiter: authLimiter },
  { path: '/api/auth/register', limiter: authLimiter }
];

/**
 * Body parsing middleware configuration
 */
const bodyParsingMiddleware = [
  express.json({ limit: '10mb' }),
  express.urlencoded({ extended: true, limit: '10mb' })
];

/**
 * Apply all middleware to Express app in optimal order
 */
const applyMiddleware = (app) => {
  // 1. Security middleware (first)
  securityMiddleware.forEach(middleware => app.use(middleware));
  
  // 2. CORS configuration
  app.use(corsMiddleware);
  
  // 3. Request logging
  app.use(requestLogger);
  
  // 4. Rate limiting
  rateLimitMiddleware.forEach(({ path, limiter }) => {
    app.use(path, limiter);
  });
  
  // 5. Body parsing (last)
  bodyParsingMiddleware.forEach(middleware => app.use(middleware));
};

module.exports = {
  securityMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  bodyParsingMiddleware,
  applyMiddleware
};
