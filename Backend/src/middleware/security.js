const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto'); // eslint-disable-line no-unused-vars
const { body, validationResult, query, param } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Security middleware configuration
 * Implements OWASP security best practices for anonymous endpoints
 */

/**
 * Malicious pattern detection
 * Common attack patterns and payloads
 */
// const MALICIOUS_PATTERNS = { // Available for future use
//   // SQL Injection patterns
//   sqlInjection: [
//     /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
//     /(--|\*\/|\/\*)/,
//     /(\bOR\b.*=.*\bOR\b)/i,
//     /(\bAND\b.*=.*\bAND\b)/i,
//     /(\bWHERE\b.*\bOR\b)/i,
//     /(\bWHERE\b.*\bAND\b)/i,
//     /(['"`;|--]|\/\*|\*\/)/,
//     /(\b(INFORMATION_SCHEMA|SYS|MASTER|MSDB)\b)/i,
//     /(\b(XP_|SP_)\w+)/i,
//     /(\b(LOAD_FILE|INTO\s+OUTFILE|INTO\s+DUMPFILE)\b)/i,
//   ],

//   // XSS patterns
//   xss: [
//     /<script[^>]*>.*?<\/script>/gi,
//     /javascript:/gi,
//     /on\w+\s*=/gi,
//     /<iframe[^>]*>/gi,
//     /<object[^>]*>/gi,
//     /<embed[^>]*>/gi,
//     /<link[^>]*>/gi,
//     /<meta[^>]*>/gi,
//     /expression\s*\(/gi,
//     /@import/gi,
//     /vbscript:/gi,
//     /data:text\/html/gi,
//   ],

//   // Command injection patterns
//   commandInjection: [
//     /(\||&|;|\$\(|`|\\|\$\{)/,
//     /(wget|curl|nc|netcat|telnet)/i,
//     /(rm|mv|cp|cat|ls|ps|kill|chmod|chown)/i,
//     /(\/bin|\/usr|\/etc|\/var)\//i,
//     /(\b(eval|exec|system|shell_exec|passthru|popen|proc_open)\b)/i,
//   ],

//   // Path traversal patterns
//   pathTraversal: [
//     /\.\.\//,
//     /\.\.\\/,
//     /%2e%2e%2f/i,
//     /%2e%2e\\/i,
//     /\.\.%2f/i,
//     /\.\.%5c/i,
//     /\/etc\//i,
//     /\/proc\//i,
//     /\/sys\//i,
//   ],
// };

/**
 * Suspicious user agents and patterns
 */
// const SUSPICIOUS_USER_AGENTS = [
//   /bot/i,
//   /crawler/i,
//   /spider/i,
//   /scraper/i,
//   /scanner/i,
//   /curl/i,
//   /wget/i,
//   /python/i,
//   /perl/i,
//   /java/i,
//   /go-http/i,
//   /postman/i,
//   /insomnia/i,
// ];

// Helmet configuration for security headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });
      res.status(429).json({
        error: 'Too many requests',
        message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// Different rate limiters for different endpoints
const rateLimiters = {
  // General API rate limiting
  general: createRateLimiter(
    parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'test' ? 10000 : 1000), // Much higher limit for testing
    'Too many requests from this IP, please try again later.',
  ),

  // Strict rate limiting for authentication endpoints
  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    process.env.NODE_ENV === 'test' ? 1000 : 100, // Much higher limit for testing
    'Too many authentication attempts, please try again later.',
  ),

  // Rate limiting for questionnaire submissions
  submission: createRateLimiter(
    60 * 1000, // 1 minute
    process.env.NODE_ENV === 'test' ? 1000 : 10, // Much higher limit for testing
    'Too many submissions, please wait before submitting again.',
  ),

  // Rate limiting for QR code generation
  qrGeneration: createRateLimiter(
    60 * 1000, // 1 minute
    process.env.NODE_ENV === 'test' ? 1000 : 20, // Much higher limit for testing
    'Too many QR code generation requests, please try again later.',
  ),

  // Rate limiting for anonymous response submission (enhanced)
  anonymousSubmission: createRateLimiter(
    60 * 1000, // 1 minute
    process.env.NODE_ENV === 'test' ? 1000 : 10, // Much higher limit for testing
    'Too many submission attempts. Please try again later.',
  ),

  // Rate limiting for QR code scanning
  qrScanTracking: createRateLimiter(
    60 * 1000, // 1 minute
    process.env.NODE_ENV === 'test' ? 1000 : 100, // Much higher limit for testing
    'Too many scan requests. Please try again later.',
  ),

  // Rate limiting for analytics endpoints
  analytics: createRateLimiter(
    60 * 1000, // 1 minute
    process.env.NODE_ENV === 'test' ? 1000 : 50, // Much higher limit for testing
    'Too many analytics requests. Please try again later.',
  ),
};

// Input validation middleware
const validateRequest = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Input validation failed', {
        errors: errors.array(),
        ip: req.ip,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params,
      });

      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: errors.array().map((error) => ({
          field: error.path,
          message: error.msg,
          value: error.value,
        })),
      });
    }

    next();
  };
};

// Common validation schemas
const validationSchemas = {
  // User registration validation
  userRegistration: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(
        'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character',
      ),
    body('firstName')
      .optional()
      .isLength({ min: 1, max: 100 })
      .trim()
      .withMessage('First name must be between 1 and 100 characters'),
    body('lastName')
      .optional()
      .isLength({ min: 1, max: 100 })
      .trim()
      .withMessage('Last name must be between 1 and 100 characters'),
  ],

  // User login validation
  userLogin: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],

  // Questionnaire creation validation
  questionnaireCreation: [
    body('title')
      .isLength({ min: 1, max: 255 })
      .trim()
      .withMessage('Title must be between 1 and 255 characters'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .trim()
      .withMessage('Description must not exceed 1000 characters'),
    body('categoryMapping').optional().isJSON().withMessage('Category mapping must be valid JSON'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  ],

  // Question creation validation
  questionCreation: [
    body('questionText')
      .isLength({ min: 1, max: 1000 })
      .trim()
      .withMessage('Question text must be between 1 and 1000 characters'),
    body('questionType')
      .isIn(['text', 'rating', 'multiple_choice', 'checkbox', 'dropdown'])
      .withMessage('Invalid question type'),
    body('category')
      .optional()
      .isLength({ max: 100 })
      .trim()
      .withMessage('Category must not exceed 100 characters'),
    body('isRequired').optional().isBoolean().withMessage('isRequired must be a boolean'),
    body('questionOrder')
      .isInt({ min: 0 })
      .withMessage('Question order must be a non-negative integer'),
    body('options').optional().isJSON().withMessage('Options must be valid JSON'),
    body('validationRules').optional().isJSON().withMessage('Validation rules must be valid JSON'),
  ],

  // Response submission validation
  responseSubmission: [
    body('questionnaireId').isInt({ min: 1 }).withMessage('Valid questionnaire ID is required'),
    body('qrCodeId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('QR code ID must be a positive integer'),
    body('answers').isArray({ min: 1 }).withMessage('At least one answer is required'),
    body('answers.*.questionId')
      .isInt({ min: 1 })
      .withMessage('Each answer must have a valid question ID'),
    body('answers.*.answerValue')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Answer value must not exceed 1000 characters'),
    body('answers.*.ratingScore')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating score must be between 1 and 5'),
  ],

  // ID parameter validation
  idParam: [param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')],

  // Pagination query validation
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove server information
  try {
    res.removeHeader('X-Powered-By');
  } catch (error) {
    // Header might not exist, ignore
  }

  // Add custom security headers (lowercase for consistency with tests)
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('x-xss-protection', '1; mode=block');
  res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');

  next();
};

// IP whitelist middleware (optional)
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // No IP restriction
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    if (allowedIPs.includes(clientIP)) {
      return next();
    }

    logger.warn('IP not whitelisted', {
      ip: clientIP,
      path: req.path,
      userAgent: req.get('User-Agent'),
    });

    res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address is not authorized to access this resource',
    });
  };
};

// Request size limiter
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > parseSize(maxSize)) {
      return res.status(413).json({
        error: 'Request too large',
        message: `Request size exceeds maximum allowed size of ${maxSize}`,
      });
    }
    next();
  };
};

// Helper function to parse size strings
const parseSize = (size) => {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  if (!match) return 0;
  return parseInt(match[1]) * units[match[2]];
};

// Input validation middleware
const validateInput = (req, res, next) => {
  // Check request size first (before authentication)
  const contentLength = req.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Request size exceeds maximum allowed limit',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }

  // Validate required fields for login
  if (req.path && req.path.includes('/auth/login')) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Email and password are required',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  next();
};

module.exports = {
  helmetConfig,
  rateLimiters,
  validateRequest,
  validationSchemas,
  securityHeaders,
  ipWhitelist,
  requestSizeLimiter,
  validateInput,
};
