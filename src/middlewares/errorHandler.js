const { logger } = require('../utils/logger');

/**
 * 404 Handler for unknown routes
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found.`
  });
}

/**
 * Global Error Handler Middleware
 */
function globalErrorHandler(err, req, res, next) {
  logger.error('Unhandled Server Error:', {
    error: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please try again later.' 
      : err.message || 'Internal Server Error'
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
