const { logger } = require('./logger');

/**
 * Standardized success response format
 */
const sendSuccess = (res, data, statusCode = 200, message = 'Success') => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };

  // Add pagination metadata if present
  if (data && data.pagination) {
    response.pagination = data.pagination;
    response.data = data.results || data.data || data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Standardized error response format
 */
const sendError = (res, error, statusCode = 500, message = 'Internal server error') => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  // Add validation errors if present
  if (error.details || error.errors) {
    response.errors = error.details || error.errors;
  }

  // Add error details in development
  if (process.env.NODE_ENV === 'development') {
    response.error = error.message;
    response.stack = error.stack;
  }

  // Log error for monitoring
  logger.error('API Error Response', {
    message: error.message,
    statusCode,
    path: res.req?.originalUrl,
    method: res.req?.method,
    stack: error.stack
  });

  return res.status(statusCode).json(response);
};

/**
 * Async wrapper for route handlers with consistent error handling
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Log the error
      logger.error('Async handler error', {
        error: error.message,
        stack: error.stack,
        path: req.originalUrl,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query
      });

      // Send standardized error response
      sendError(res, error, error.statusCode || 500, error.message || 'Internal server error');
    });
  };
};

/**
 * Validation error helper
 */
const validationError = (errors) => {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.details = errors;
  return error;
};

/**
 * Not found error helper
 */
const notFoundError = (resource = 'Resource') => {
  const error = new Error(`${resource} not found`);
  error.statusCode = 404;
  return error;
};

/**
 * Unauthorized error helper
 */
const unauthorizedError = (message = 'Unauthorized') => {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
};

/**
 * Forbidden error helper
 */
const forbiddenError = (message = 'Forbidden') => {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
};

/**
 * Conflict error helper
 */
const conflictError = (message = 'Resource already exists') => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

module.exports = {
  sendSuccess,
  sendError,
  asyncHandler,
  validationError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
  conflictError
};
