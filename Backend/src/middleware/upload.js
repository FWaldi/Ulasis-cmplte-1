const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * File upload security configuration
 */
const FILE_UPLOAD_CONFIG = {
  // Allowed file types for QR code logos
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],

  // Allowed file extensions
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],

  // Maximum file size (5MB)
  maxFileSize: 5 * 1024 * 1024,

  // Maximum files per request
  maxFiles: 1,

  // Upload directory
  uploadDir: 'uploads/qr-logos',

  // Rate limiting for uploads (uploads per minute per user)
  uploadRateLimit: 10,
};

/**
 * Magic numbers for file type verification
 */
const MAGIC_NUMBERS = {
  'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/jpeg': Buffer.from([0xff, 0xd8, 0xff]),
  'image/gif': Buffer.from([0x47, 0x49, 0x46, 0x38]),
  'image/webp': Buffer.from([0x52, 0x49, 0x46, 0x46]),
};

/**
 * Verify file type using magic numbers
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - Expected MIME type
 * @returns {boolean} - True if file type matches
 */
const verifyFileType = (buffer, mimeType) => {
  const magicNumber = MAGIC_NUMBERS[mimeType];
  if (!magicNumber) return false;

  return buffer.slice(0, magicNumber.length).equals(magicNumber);
};

/**
 * Generate secure filename
 * @param {string} originalName - Original filename
 * @returns {string} - Secure filename
 */
const generateSecureFilename = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `qr-logo-${timestamp}-${random}${ext}`;
};

/**
 * Create user-specific upload directory
 * @param {number} userId - User ID
 * @returns {string} - Upload directory path
 */
const createUserUploadDir = (userId) => {
  const uploadPath = path.join(process.cwd(), FILE_UPLOAD_CONFIG.uploadDir, userId.toString());

  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    logger.info(`Created upload directory: ${uploadPath}`);
  }

  return uploadPath;
};

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        return cb(new Error('User authentication required for file upload'), null);
      }

      const uploadPath = createUserUploadDir(userId);
      cb(null, uploadPath);
    } catch (error) {
      logger.error('Error creating upload directory:', error);
      cb(error, null);
    }
  },

  filename: (req, file, cb) => {
    try {
      const secureFilename = generateSecureFilename(file.originalname);
      cb(null, secureFilename);
    } catch (error) {
      logger.error('Error generating secure filename:', error);
      cb(error, null);
    }
  },
});

/**
 * File filter for security validation
 */
const fileFilter = (req, file, cb) => {
  try {
    // Check MIME type
    if (!FILE_UPLOAD_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed types: ${FILE_UPLOAD_CONFIG.allowedMimeTypes.join(', ')}`,
        ),
        false,
      );
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!FILE_UPLOAD_CONFIG.allowedExtensions.includes(ext)) {
      return cb(
        new Error(
          `Invalid file extension: ${ext}. Allowed extensions: ${FILE_UPLOAD_CONFIG.allowedExtensions.join(', ')}`,
        ),
        false,
      );
    }

    cb(null, true);
  } catch (error) {
    logger.error('Error in file filter:', error);
    cb(error, false);
  }
};

/**
 * Multer configuration
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_UPLOAD_CONFIG.maxFileSize,
    files: FILE_UPLOAD_CONFIG.maxFiles,
  },
});

/**
 * Advanced file security middleware
 * Validates file content after upload
 */
const fileSecurityMiddleware = (req, res, next) => {
  console.log('fileSecurityMiddleware called');
  if (!req.file) {
    console.log('No file in fileSecurityMiddleware, calling next()');
    return next();
  }

  try {
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    // Verify file type using magic numbers
    const isValidFileType = verifyFileType(fileBuffer, req.file.mimetype);
    if (!isValidFileType) {
      // Remove the uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'File type does not match its extension or content',
        },
      });
    }

    // Additional security checks can be added here:
    // - Virus scanning
    // - Content analysis
    // - Metadata stripping

    logger.info(
      `File uploaded successfully: ${req.file.filename} for user ${req.user?.id || req.user?.sub}`,
    );
    next();
  } catch (error) {
    logger.error('Error in file security middleware:', error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'FILE_SECURITY_ERROR',
        message: 'Error processing uploaded file',
      },
    });
  }
};

/**
 * Generate file URL for QR code logos
 * @param {string} filename - Filename
 * @param {number} userId - User ID
 * @returns {string} - File URL
 */
const generateFileUrl = (filename, userId) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/v1/uploads/qr-logos/${userId}/${filename}`;
};

/**
 * Clean up file from storage
 * @param {string} filePath - File path to delete
 */
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`File cleaned up: ${filePath}`);
    }
  } catch (error) {
    logger.error('Error cleaning up file:', error);
  }
};

/**
 * Clean up user directory when empty
 * @param {number} userId - User ID
 */
const cleanupUserDirectory = (userId) => {
  try {
    const userDir = path.join(process.cwd(), FILE_UPLOAD_CONFIG.uploadDir, userId.toString());

    if (fs.existsSync(userDir)) {
      const files = fs.readdirSync(userDir);
      if (files.length === 0) {
        fs.rmdirSync(userDir);
        logger.info(`Empty user directory cleaned up: ${userDir}`);
      }
    }
  } catch (error) {
    logger.error('Error cleaning up user directory:', error);
  }
};

/**
 * Rate limiting middleware for file uploads
 */
const uploadRateLimitMiddleware = (req, res, next) => {
  console.log('uploadRateLimitMiddleware called');
  // This would typically use a rate limiting store like Redis
  // For now, we'll implement a simple in-memory check
  const userId = req.user?.id || req.user?.sub;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  // Initialize rate limit tracking if not exists
  if (!global.uploadRateLimits) {
    global.uploadRateLimits = {};
  }

  if (!global.uploadRateLimits[userId]) {
    global.uploadRateLimits[userId] = { count: 0, resetTime: now + windowMs };
  }

  const userLimit = global.uploadRateLimits[userId];

  // Reset counter if window has expired
  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + windowMs;
  }

  // Check rate limit
  if (userLimit.count >= FILE_UPLOAD_CONFIG.uploadRateLimit) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: `Upload rate limit exceeded. Maximum ${FILE_UPLOAD_CONFIG.uploadRateLimit} uploads per minute.`,
      },
    });
  }

  // Increment counter
  userLimit.count++;
  console.log('uploadRateLimitMiddleware calling next()');
  next();
};

/**
 * CDN integration preparation for Business plan
 * This would integrate with CDN services like AWS S3, CloudFront, etc.
 */
const cdnIntegration = {
  /**
   * Upload file to CDN (placeholder for Business plan)
   * @param {string} filePath - Local file path
   * @param {string} filename - Filename
   * @param {number} userId - User ID
   * @returns {Promise<string>} - CDN URL
   */
  uploadToCDN: (filePath, filename, userId) => {
    // This would integrate with CDN services
    // For now, return local URL
    return generateFileUrl(filename, userId);
  },

  /**
   * Delete file from CDN (placeholder for Business plan)
   * @param {string} filename - Filename
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} - Success status
   */
  deleteFromCDN: (_filename, _userId) => {
    // This would delete from CDN services
    // For now, just return true
    return true;
  },
};

module.exports = {
  upload,
  fileSecurityMiddleware,
  uploadRateLimitMiddleware,
  generateFileUrl,
  cleanupFile,
  cleanupUserDirectory,
  cdnIntegration,
  FILE_UPLOAD_CONFIG,
};
