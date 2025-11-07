'use strict';

const logger = require('./logger');

/**
 * Custom Error Classes
 */

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

class DatabaseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DatabaseError';
    this.status = 500;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

/**
 * Centralized error handling utility
 * Provides consistent error response formatting across the application
 */

/**
 * Error codes and their corresponding HTTP status codes
 */
const ERROR_CODES = {
  // Validation Errors (400)
  VALIDATION_ERROR: { status: 400, message: 'Request validation failed' },
  INVALID_FILE_TYPE: { status: 400, message: 'Invalid file type' },
  FILE_TOO_LARGE: { status: 400, message: 'File size exceeds limit' },
  INVALID_INPUT: { status: 400, message: 'Invalid input provided' },
  MISSING_REQUIRED_FIELD: { status: 400, message: 'Required field is missing' },

  // Authentication Errors (401)
  UNAUTHORIZED: { status: 401, message: 'Authentication required' },
  INVALID_TOKEN: { status: 401, message: 'Invalid or expired token' },
  TOKEN_EXPIRED: { status: 401, message: 'Authentication token has expired' },

  // Authorization Errors (403)
  ACCESS_DENIED: { status: 403, message: 'Access denied' },
  INSUFFICIENT_PERMISSIONS: { status: 403, message: 'Insufficient permissions' },
  SUBSCRIPTION_LIMIT_EXCEEDED: { status: 403, message: 'Subscription limit exceeded' },
  UPLOAD_RATE_LIMIT_EXCEEDED: { status: 429, message: 'Upload rate limit exceeded' },

  // Not Found Errors (404)
  NOT_FOUND: { status: 404, message: 'Resource not found' },
  QUESTIONNAIRE_NOT_FOUND: { status: 404, message: 'Questionnaire not found' },
  QUESTION_NOT_FOUND: { status: 404, message: 'Question not found' },
  QR_CODE_NOT_FOUND: { status: 404, message: 'QR code not found' },
  USER_NOT_FOUND: { status: 404, message: 'User not found' },

  // Conflict Errors (409)
  DUPLICATE_RESOURCE: { status: 409, message: 'Resource already exists' },
  QUESTIONNAIRE_LIMIT_REACHED: {
    status: 409,
    message: 'Questionnaire limit reached for subscription plan',
  },

  // Business Logic Errors (422)
  INVALID_QUESTIONNAIRE_STATE: { status: 422, message: 'Questionnaire is in an invalid state' },
  INVALID_QR_CODE: { status: 422, message: 'QR code is invalid or expired' },
  CANNOT_DELETE_ACTIVE_RESOURCE: {
    status: 422,
    message: 'Cannot delete resource with active dependencies',
  },

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED: { status: 429, message: 'Rate limit exceeded' },

  // Server Errors (500)
  INTERNAL_SERVER_ERROR: { status: 500, message: 'Internal server error' },
  DATABASE_ERROR: { status: 500, message: 'Database operation failed' },
  FILE_UPLOAD_ERROR: { status: 500, message: 'File upload failed' },
  QR_GENERATION_ERROR: { status: 500, message: 'QR code generation failed' },
  EMAIL_SEND_ERROR: { status: 500, message: 'Failed to send email' },
  SANITIZATION_ERROR: { status: 500, message: 'Error processing request data' },

  // Service Unavailable (503)
  SERVICE_UNAVAILABLE: { status: 503, message: 'Service temporarily unavailable' },
  DATABASE_CONNECTION_ERROR: { status: 503, message: 'Database connection unavailable' },
};

/**
 * Standard error response format
 * @param {string} code - Error code
 * @param {string} message - Error message (optional, will use default if not provided)
 * @param {Array} details - Additional error details (optional)
 * @param {Object} metadata - Additional metadata (optional)
 * @returns {Object} Formatted error response
 */
const formatErrorResponse = (code, message = null, details = null, metadata = null) => {
  const errorInfo = ERROR_CODES[code] || ERROR_CODES.INTERNAL_SERVER_ERROR;

  const response = {
    success: false,
    error: {
      code,
      message: message || errorInfo.message,
      status: errorInfo.status,
    },
    timestamp: new Date().toISOString(),
  };

  if (details && details.length > 0) {
    response.error.details = details;
  }

  if (metadata) {
    response.error.metadata = metadata;
  }

  return response;
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} code - Error code
 * @param {string} message - Error message (optional)
 * @param {Array} details - Additional error details (optional)
 * @param {Object} metadata - Additional metadata (optional)
 */
const sendErrorResponse = (res, code, message = null, details = null, metadata = null) => {
  const errorInfo = ERROR_CODES[code] || ERROR_CODES.INTERNAL_SERVER_ERROR;
  const response = formatErrorResponse(code, message, details, metadata);

  // Log error for debugging
  logger.warn(`Error response sent: ${code}`, {
    code,
    message: message || errorInfo.message,
    status: errorInfo.status,
    details,
    metadata,
    url: res.req?.url,
    method: res.req?.method,
    userId: res.req?.user?.id,
    requestId: res.req?.requestId,
  });

  res.status(errorInfo.status).json(response);
};

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {number} status - HTTP status code (default: 200)
 * @param {Object} metadata - Additional metadata (optional)
 */
const sendSuccessResponse = (res, data = null, status = 200, metadata = null) => {
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  if (metadata) {
    response.metadata = metadata;
  }

  // Add request ID if available
  if (res.req?.requestId) {
    response.requestId = res.req.requestId;
  }

  res.status(status).json(response);
};

/**
 * Handle Sequelize validation errors
 * @param {Error} error - Sequelize validation error
 * @returns {Object} Formatted error response
 */
const handleSequelizeError = (error) => {
  if (error.name === 'SequelizeValidationError') {
    const details = error.errors.map((err) => ({
      field: err.path,
      message: err.message,
      value: err.value,
    }));

    return formatErrorResponse('VALIDATION_ERROR', 'Validation failed', details);
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors[0]?.path || 'unknown';
    return formatErrorResponse('DUPLICATE_RESOURCE', `${field} already exists`);
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return formatErrorResponse('INVALID_INPUT', 'Referenced resource does not exist');
  }

  if (error.name === 'SequelizeConnectionError') {
    return formatErrorResponse('DATABASE_CONNECTION_ERROR');
  }

  return formatErrorResponse('DATABASE_ERROR');
};

/**
 * Handle JWT errors
 * @param {Error} error - JWT error
 * @returns {Object} Formatted error response
 */
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return formatErrorResponse('INVALID_TOKEN');
  }

  if (error.name === 'TokenExpiredError') {
    return formatErrorResponse('TOKEN_EXPIRED');
  }

  if (error.name === 'NotBeforeError') {
    return formatErrorResponse('INVALID_TOKEN', 'Token not active');
  }

  return formatErrorResponse('INVALID_TOKEN');
};

/**
 * Handle file upload errors
 * @param {Error} error - Multer error
 * @returns {Object} Formatted error response
 */
const handleFileUploadError = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return formatErrorResponse('FILE_TOO_LARGE', 'File size exceeds the allowed limit');
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return formatErrorResponse('INVALID_INPUT', 'Too many files uploaded');
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return formatErrorResponse('INVALID_INPUT', 'Unexpected file field');
  }

  if (error.message.includes('Invalid file type')) {
    return formatErrorResponse('INVALID_FILE_TYPE', error.message);
  }

  return formatErrorResponse('FILE_UPLOAD_ERROR');
};

/**
 * Async error wrapper for route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function with error handling
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (err, req, res, _next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log the error
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    requestId: req.requestId,
  });

  let errorResponse;

  // Handle specific error types
  if (err.name && err.name.startsWith('Sequelize')) {
    errorResponse = handleSequelizeError(err);
  } else if (err.name && (err.name.includes('JWT') || err.name.includes('Token'))) {
    errorResponse = handleJWTError(err);
  } else if (err.code && err.code.startsWith('LIMIT_')) {
    errorResponse = handleFileUploadError(err);
  } else if (err instanceof SyntaxError) {
    errorResponse = formatErrorResponse('INVALID_INPUT', 'Invalid JSON format');
  } else if (err.code && ERROR_CODES[err.code]) {
    errorResponse = formatErrorResponse(err.code, err.message);
  } else {
    errorResponse = formatErrorResponse('INTERNAL_SERVER_ERROR');
  }

  // Add development-specific details
  if (isDevelopment) {
    errorResponse.error.stack = err.stack;
    errorResponse.error.originalError = {
      name: err.name,
      message: err.message,
    };
  }

  // Add request ID if available
  if (req.requestId) {
    errorResponse.requestId = req.requestId;
  }

  const status = errorResponse.error.status || 500;
  res.status(status).json(errorResponse);
};

/**
 * 404 handler middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
  const errorResponse = formatErrorResponse('NOT_FOUND', `Route ${req.originalUrl} not found`);

  if (req.requestId) {
    errorResponse.requestId = req.requestId;
  }

  res.status(404).json(errorResponse);
};

module.exports = {
  ValidationError,
  DatabaseError,
  NotFoundError,
  ERROR_CODES,
  formatErrorResponse,
  sendErrorResponse,
  sendSuccessResponse,
  handleSequelizeError,
  handleJWTError,
  handleFileUploadError,
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
};
