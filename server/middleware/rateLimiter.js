const rateLimit = require('express-rate-limit');

// General rate limiter (per IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth rate limiter (stricter for login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts, please try again later'
  },
  skipSuccessfulRequests: true
});

// API rate limiter (for authenticated users)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // 200 requests per window for authenticated users
  message: {
    success: false,
    message: 'Too many API requests, please slow down'
  }
});

// Admin rate limiter (more lenient for admins)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // 500 requests per window for admins
  message: {
    success: false,
    message: 'Too many requests'
  }
});

// Upload rate limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    success: false,
    message: 'Too many uploads, please try again later'
  }
});

// Comment rate limiter
const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 comments per hour
  message: {
    success: false,
    message: 'Too many comments, please slow down'
  }
});

// Dynamic rate limiter based on user role
const createRoleBasedLimiter = (req, res, next) => {
  if (req.user) {
    if (req.user.role === 'admin') {
      return adminLimiter(req, res, next);
    } else if (['editor', 'author'].includes(req.user.role)) {
      return apiLimiter(req, res, next);
    }
  }
  return generalLimiter(req, res, next);
};

module.exports = {
  generalLimiter,
  authLimiter,
  apiLimiter,
  adminLimiter,
  uploadLimiter,
  commentLimiter,
  createRoleBasedLimiter
};


