'use strict';

const Joi = require('joi');
const { validationResult } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');
const logger = require('../utils/logger');

/**
 * Validation middleware factory
 * Creates validation middleware using Joi schemas
 */

/**
 * Common validation schemas
 */
const commonSchemas = {
  id: Joi.number().integer().positive().required(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
  optionalPagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
  dateRange: Joi.object({
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
  }),
};

/**
 * Questionnaire validation schemas
 */
const questionnaireSchemas = {
  create: Joi.object({
    title: Joi.string().trim().min(1).max(255).required().messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title cannot exceed 255 characters',
    }),
    description: Joi.string().trim().max(2000).optional().allow(''),
    categoryMapping: Joi.object().optional().default({}).messages({
      'object.base': 'Category mapping must be a valid object',
    }),
    isActive: Joi.boolean().optional().default(true),
    isPublic: Joi.boolean().optional().default(false),
    welcomeMessage: Joi.string().trim().max(1000).optional().allow(''),
    thankYouMessage: Joi.string().trim().max(1000).optional().allow(''),
    themeSettings: Joi.object().optional().default({}),
    settings: Joi.object().optional().default({}),
    questions: Joi.array().items(
      Joi.object({
        questionText: Joi.string().trim().min(1).max(2000).required(),
        questionType: Joi.string().valid(
          'text', 'textarea', 'single_choice', 'multiple_choice', 'rating', 'scale',
          'yes_no', 'email', 'number', 'date', 'time', 'file_upload',
        ).required(),
        category: Joi.string().trim().max(100).optional().allow(''),
        isRequired: Joi.boolean().optional().default(false),
        orderIndex: Joi.number().integer().min(0).required(),
        options: Joi.alternatives().try(
          Joi.array().items(Joi.string().trim()),
          Joi.object().pattern(/\d+/, Joi.string().trim()),
        ).optional(),
        validationRules: Joi.object().optional().default({}),
        placeholder: Joi.string().trim().max(255).optional().allow(''),
        helpText: Joi.string().trim().max(1000).optional().allow(''),
        maxLength: Joi.number().integer().min(1).optional(),
        minValue: Joi.number().optional(),
        maxValue: Joi.number().min(Joi.ref('minValue')).optional(),
        settings: Joi.object().optional().default({}),
      }),
    ).optional().default([]),
  }),

  update: Joi.object({
    title: Joi.string().trim().min(1).max(255).optional().messages({
      'string.empty': 'Title cannot be empty',
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title cannot exceed 255 characters',
    }),
    description: Joi.string().trim().max(2000).optional().allow(''),
    categoryMapping: Joi.object().optional().messages({
      'object.base': 'Category mapping must be a valid object',
    }),
    isActive: Joi.boolean().optional(),
    isPublic: Joi.boolean().optional(),
    welcomeMessage: Joi.string().trim().max(1000).optional().allow(''),
    thankYouMessage: Joi.string().trim().max(1000).optional().allow(''),
    themeSettings: Joi.object().optional(),
    settings: Joi.object().optional(),
  }).min(1),

  list: Joi.object({
    page: commonSchemas.pagination.extract('page'),
    limit: commonSchemas.pagination.extract('limit'),
    includeInactive: Joi.boolean().optional().default(false),
    category: Joi.string().trim().optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
  }),
};

/**
 * Question validation schemas
 */
const questionSchemas = {
  create: Joi.object({
    questionText: Joi.string().trim().min(1).max(2000).required().messages({
      'string.empty': 'Question text is required',
      'string.min': 'Question text must be at least 1 character long',
      'string.max': 'Question text cannot exceed 2000 characters',
    }),
    questionType: Joi.string()
      .valid(
        'text',
        'textarea',
        'single_choice',
        'multiple_choice',
        'rating',
        'scale',
        'yes_no',
        'email',
        'number',
        'date',
        'time',
        'file_upload',
      )
      .required(),
    category: Joi.string().trim().max(100).optional().allow(''),
    isRequired: Joi.boolean().optional().default(false),
    orderIndex: Joi.number().integer().min(0).optional(),
    options: Joi.alternatives().try(
      Joi.array().items(Joi.string().trim()),
      Joi.object().pattern(/\d+/, Joi.string().trim()),
    ).optional().custom((value, _helpers) => {
      // Convert object with numeric keys to array
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const keys = Object.keys(value).map(k => parseInt(k)).filter(k => !isNaN(k));
        if (keys.length > 0) {
          keys.sort((a, b) => a - b);
          return keys.map(k => value[k.toString()]);
        }
      }
      return value;
    }).messages({
      'alternatives.match': 'Options must be an array of strings',
    }),
    validationRules: Joi.object().optional().default({}),
    placeholder: Joi.string().trim().max(255).optional().allow(''),
    helpText: Joi.string().trim().max(1000).optional().allow(''),
    maxLength: Joi.number().integer().min(1).optional(),
    minValue: Joi.number().optional(),
    maxValue: Joi.number().min(Joi.ref('minValue')).optional(),
    settings: Joi.object().optional().default({}),
  }),

  update: Joi.object({
    questionText: Joi.string().trim().min(1).max(2000).optional(),
    questionType: Joi.string()
      .valid(
        'text',
        'textarea',
        'single_choice',
        'multiple_choice',
        'rating',
        'scale',
        'yes_no',
        'email',
        'number',
        'date',
        'time',
        'file_upload',
      )
      .optional(),
    category: Joi.string().trim().max(100).optional().allow(''),
    isRequired: Joi.boolean().optional(),
    orderIndex: Joi.number().integer().min(0).optional(),
    options: Joi.alternatives().try(
      Joi.array().items(Joi.string().trim()),
      Joi.object().pattern(/\d+/, Joi.string().trim()),
    ).optional().custom((value, _helpers) => {
      // Convert object with numeric keys to array
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const keys = Object.keys(value).map(k => parseInt(k)).filter(k => !isNaN(k));
        if (keys.length > 0) {
          keys.sort((a, b) => a - b);
          return keys.map(k => value[k.toString()]);
        }
      }
      return value;
    }),
    validationRules: Joi.object().optional(),
    placeholder: Joi.string().trim().max(255).optional().allow(''),
    helpText: Joi.string().trim().max(1000).optional().allow(''),
    maxLength: Joi.number().integer().min(1).optional(),
    minValue: Joi.number().optional(),
    maxValue: Joi.number().min(Joi.ref('minValue')).optional(),
    settings: Joi.object().optional(),
  }).min(1),

  reorder: Joi.object({
    questionOrders: Joi.alternatives().try(
      Joi.array()
        .items(
          Joi.object({
            question_id: commonSchemas.id,
            order_index: Joi.number().integer().min(0).required(),
          }),
        )
        .min(1),
      Joi.object().pattern(
        /\d+/,
        Joi.object({
          question_id: commonSchemas.id,
          order_index: Joi.number().integer().min(0).required(),
        }),
      ),
    )
      .required()
      .custom((value, _helpers) => {
      // Convert object with numeric keys to array
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const keys = Object.keys(value).map(k => parseInt(k)).filter(k => !isNaN(k));
          if (keys.length > 0) {
            keys.sort((a, b) => a - b);
            return keys.map(k => value[k.toString()]);
          }
        }
        return value;
      })
      .messages({
        'array.min': 'At least one question must be provided for reordering',
      }),
  }),
};

/**
 * QR Code validation schemas
 */
const qrCodeSchemas = {
  create: Joi.object({
    questionnaireId: commonSchemas.id,
    locationTag: Joi.string().trim().max(255).optional().allow(''),
    customColors: Joi.object({
      foreground: Joi.string()
        .pattern(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      background: Joi.string()
        .pattern(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
    })
      .optional()
      .default({}),
    size: Joi.number().integer().min(50).max(1000).optional().default(200),
    errorCorrectionLevel: Joi.string().valid('L', 'M', 'Q', 'H').optional().default('M'),
    expiresAt: Joi.date().iso().min('now').optional(),
    settings: Joi.object().optional().default({}),
  }),

  update: Joi.object({
    locationTag: Joi.string().trim().max(255).optional().allow(''),
    customColors: Joi.object({
      foreground: Joi.string()
        .pattern(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      background: Joi.string()
        .pattern(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
    }).optional(),
    size: Joi.number().integer().min(50).max(1000).optional(),
    errorCorrectionLevel: Joi.string().valid('L', 'M', 'Q', 'H').optional(),
    isActive: Joi.boolean().optional(),
    expiresAt: Joi.date().iso().min('now').optional(),
    settings: Joi.object().optional(),
  }).min(1),

  list: Joi.object({
    page: commonSchemas.optionalPagination.extract('page'),
    limit: commonSchemas.optionalPagination.extract('limit'),
    questionnaireId: commonSchemas.id.optional(),
    locationTag: Joi.string().trim().optional(),
    includeInactive: Joi.boolean().optional().default(false),
    onlyValid: Joi.boolean().optional().default(false),
  }),
};

/**
 * Anonymous Response validation schemas
 */
const anonymousResponseSchemas = {
  submit: Joi.object({
    questionnaire_id: commonSchemas.id.required(),
    qr_code_id: commonSchemas.id.optional(),
    answers: Joi.array().items(
      Joi.object({
        question_id: commonSchemas.id.required(),
        answer_value: Joi.string().trim().max(10000).optional().allow(''),
        rating_score: Joi.number().min(0).max(10).optional(),
        selected_options: Joi.array().items(Joi.string().trim()).optional(),
        is_skipped: Joi.boolean().optional().default(false),
      }),
    ).min(1).required().messages({
      'array.min': 'At least one answer is required',
    }),
  }),
};

/**
 * File upload validation schemas
 */
const fileUploadSchemas = {
  logo: Joi.object({
    fieldname: Joi.string().valid('logo').required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().valid('image/png', 'image/jpeg', 'image/jpg', 'image/gif').required(),
    size: Joi.number()
      .integer()
      .max(5 * 1024 * 1024)
      .required(), // 5MB max
    buffer: Joi.binary().required(),
  }).required(),
};

/**
 * XSS Protection and Sanitization
 */

/**
 * Sanitize text content to prevent XSS attacks
 * @param {string|object} content - Content to sanitize
 * @returns {string|object} - Sanitized content
 */
const sanitizeContent = (content) => {
  if (typeof content === 'string') {
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
  }

  if (Array.isArray(content)) {
    // Handle arrays by recursively sanitizing each element
    return content.map(item => sanitizeContent(item));
  }

  if (typeof content === 'object' && content !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(content)) {
      if (typeof value === 'string') {
        sanitized[key] = DOMPurify.sanitize(value, {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: [],
          KEEP_CONTENT: true,
        });
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeContent(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return content;
};

/**
 * Sanitize HTML content (allowing limited safe tags)
 * @param {string} htmlContent - HTML content to sanitize
 * @returns {string} - Sanitized HTML content
 */
const sanitizeHTML = (htmlContent) => {
  return DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

/**
 * Validate and sanitize file upload for security
 * @param {Object} file - Multer file object
 * @returns {Object} Validation result
 */
const validateFileUpload = (file) => {
  const errors = [];
  const warnings = [];

  if (!file) {
    return { isValid: false, errors: ['No file uploaded'], warnings };
  }

  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('File size exceeds 5MB limit.');
  }

  // Check filename for directory traversal
  const filename = file.originalname;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    errors.push('Invalid filename detected.');
  }

  // Check for suspicious file extensions
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  if (suspiciousExtensions.includes(ext)) {
    errors.push('Suspicious file extension detected.');
  }

  // Additional security checks
  if (file.buffer && file.buffer.length > 0) {
    // Check for common malware signatures (simplified)
    const bufferString = file.buffer.toString('utf8', 0, Math.min(1024, file.buffer.length));
    const suspiciousPatterns = ['eval(', 'script', 'javascript:', 'vbscript:']; // eslint-disable-line no-script-url

    for (const pattern of suspiciousPatterns) {
      if (bufferString.toLowerCase().includes(pattern)) {
        errors.push(`Suspicious content pattern detected: ${pattern}`);
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Enhanced validation middleware factory function
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 * @param {Object} options - Additional validation options
 * @returns {Function} Express middleware function
 */
const validate = (schema, source = 'body', options = {}) => {
  return (req, res, next) => {
    const { sanitize = true, allowHTML = false, customSanitizers = {} } = options;

    console.log('Validation middleware called for source:', source);
    console.log('Request[source]:', req[source]);

    const validationResult = schema.validate(req[source], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });
    const { error } = validationResult;
    let { value } = validationResult;

    console.log('Validation error:', error);
    console.log('Validation value:', value);

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value,
      }));

      logger.warn(`Validation failed for ${source}:`, {
        url: req.url,
        method: req.method,
        userId: req.user?.id,
        errors: validationErrors,
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: validationErrors,
        },
      });
    }

    // Apply sanitization if enabled
    if (sanitize) {
      try {
        // Apply custom sanitizers first
        for (const [field, sanitizer] of Object.entries(customSanitizers)) {
          if (value[field] !== undefined) {
            value[field] = sanitizer(value[field]);
          }
        }

        // Apply general sanitization
        if (allowHTML) {
          // For fields that allow HTML, use HTML sanitization
          const htmlFields = ['description', 'welcomeMessage', 'thankYouMessage', 'helpText'];
          for (const field of htmlFields) {
            if (value[field] && typeof value[field] === 'string') {
              value[field] = sanitizeHTML(value[field]);
            }
          }

          // Sanitize other fields without HTML
          value = sanitizeContent(value);
        } else {
          // Sanitize all content without allowing HTML
          value = sanitizeContent(value);
        }
      } catch (sanitizeError) {
        logger.error('Sanitization error:', sanitizeError);
        return res.status(500).json({
          success: false,
          error: {
            code: 'SANITIZATION_ERROR',
            message: 'Error processing request data',
          },
        });
      }
    }

    // Replace source with validated and sanitized values
    req[source] = value;
    next();
  };
};

/**
 * Express-validator compatibility middleware
 * For routes that already use express-validator
 */
const checkValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: validationErrors,
      },
    });
  }
  next();
};

/**
 * Custom validation functions
 */

/**
 * Validate questionnaire ownership
 * @param {Object} questionnaire - Questionnaire model instance
 * @param {number} userId - User ID from request
 * @returns {boolean} True if user owns the questionnaire
 */
const validateQuestionnaireOwnership = (questionnaire, userId) => {
  return questionnaire && questionnaire.userId === userId;
};

/**
 * Validate question ownership through questionnaire
 * @param {Object} question - Question model instance
 * @param {number} userId - User ID from request
 * @returns {boolean} True if user owns the questionnaire containing the question
 */
const validateQuestionOwnership = (question, userId) => {
  return question && question.questionnaire && question.questionnaire.userId === userId;
};

/**
 * Validate QR code ownership through questionnaire
 * @param {Object} qrCode - QR Code model instance
 * @param {number} userId - User ID from request
 * @returns {boolean} True if user owns the questionnaire linked to the QR code
 */
const validateQRCodeOwnership = (qrCode, userId) => {
  return qrCode && qrCode.questionnaire && qrCode.questionnaire.userId === userId;
};

/**
 * Validate file upload for QR code logos
 * @param {Object} file - Multer file object
 * @returns {Object} Validation result
 */
const validateQRCodeLogo = (file) => {
  const fileValidation = validateFileUpload(file);

  if (!fileValidation.isValid) {
    return fileValidation;
  }

  // Additional QR code logo specific validations
  const errors = [...fileValidation.errors];
  const warnings = [...fileValidation.warnings];

  // Check file type
  const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  if (!allowedMimes.includes(file.mimetype)) {
    errors.push('Invalid file type. Only PNG, JPG, JPEG, GIF, and WebP are allowed.');
  }

  // Check file size (5MB max for logos)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('Logo file size exceeds 5MB limit.');
  }

  // Check minimum dimensions (optional)
  if (file.buffer) {
    // This would require image processing library like 'sharp' for actual dimension checking
    // For now, just add a warning about recommended size
    if (file.size < 1024) {
      // Less than 1KB
      warnings.push('Logo file is very small and may not display well.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

module.exports = {
  // Validation schemas
  commonSchemas,
  questionnaireSchemas,
  questionSchemas,
  qrCodeSchemas,
  anonymousResponseSchemas,
  fileUploadSchemas,

  // Middleware functions
  validate,
  checkValidationErrors,

  // Sanitization functions
  sanitizeContent,
  sanitizeHTML,
  validateFileUpload,

  // Custom validation functions
  validateQuestionnaireOwnership,
  validateQuestionOwnership,
  validateQRCodeOwnership,
  validateQRCodeLogo,

  // Specific validation middleware with sanitization
  validateQuestionnaireCreate: validate(questionnaireSchemas.create, 'body', {
    sanitize: true,
    allowHTML: true,
    customSanitizers: {
      title: (value) => sanitizeContent(value),
      description: (value) => sanitizeHTML(value),
      welcomeMessage: (value) => sanitizeHTML(value),
      thankYouMessage: (value) => sanitizeHTML(value),
    },
  }),
  validateQuestionnaireUpdate: validate(questionnaireSchemas.update, 'body', {
    sanitize: true,
    allowHTML: true,
    customSanitizers: {
      title: (value) => sanitizeContent(value),
      description: (value) => sanitizeHTML(value),
      welcomeMessage: (value) => sanitizeHTML(value),
      thankYouMessage: (value) => sanitizeHTML(value),
    },
  }),
  validateQuestionnaireList: validate(questionnaireSchemas.list, 'query', { sanitize: true }),
  validateQuestionCreate: validate(questionSchemas.create, 'body', {
    sanitize: true,
    allowHTML: true,
    customSanitizers: {
      questionText: (value) => sanitizeContent(value),
      helpText: (value) => sanitizeHTML(value),
      placeholder: (value) => sanitizeContent(value),
    },
  }),
  validateQuestionUpdate: validate(questionSchemas.update, 'body', {
    sanitize: true,
    allowHTML: true,
    customSanitizers: {
      questionText: (value) => sanitizeContent(value),
      helpText: (value) => sanitizeHTML(value),
      placeholder: (value) => sanitizeContent(value),
    },
  }),
  validateQuestionReorder: validate(questionSchemas.reorder, 'body', { sanitize: true }),
  validateQRCodeCreate: validate(qrCodeSchemas.create, 'body', { sanitize: true }),
  validateQRCodeUpdate: validate(qrCodeSchemas.update, 'body', { sanitize: true }),
  validateQRCodeList: validate(qrCodeSchemas.list, 'query', { sanitize: true }),
  validateAnonymousSubmission: validate(anonymousResponseSchemas.submit, 'body', {
    sanitize: true,
    customSanitizers: {
      'answers': (answers) => {
        if (Array.isArray(answers)) {
          return answers.map(answer => ({
            ...answer,
            answer_value: answer.answer_value ? sanitizeContent(answer.answer_value) : answer.answer_value,
          }));
        }
        return answers;
      },
    },
  }),
  validateIdParam: validate(Joi.object({ id: commonSchemas.id }), 'params', { sanitize: true }),
};
