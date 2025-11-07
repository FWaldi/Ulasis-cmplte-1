'use strict';

const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * QR Code Service
 * Handles QR code generation and management
 */
class QRCodeService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads/qr-codes');
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      logger.error('Error creating QR code upload directory:', error);
    }
  }

  /**
   * Generate unique QR code data
   * @param {number} questionnaireId - Questionnaire ID
   * @returns {string} Unique QR code data
   */
  generateQRData(questionnaireId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    return `${this.baseUrl}/api/v1/questionnaires/${questionnaireId}?qr=${timestamp}-${random}`;
  }

  /**
   * Generate QR code image
   * @param {Object} options - QR code generation options
   * @returns {Object} Generated QR code data and image path
   */
  async generateQRCode(options) {
    try {
      const {
        questionnaireId,
        locationTag: _locationTag, // eslint-disable-line no-unused-vars
        customColors = {},
        size = 200,
        errorCorrectionLevel = 'M',
      } = options;

      // Generate QR code data
      const qrData = this.generateQRData(questionnaireId);

      // QR code generation options
      const qrOptions = {
        width: size,
        margin: 1,
        color: {
          dark: customColors.foreground || '#000000',
          light: customColors.background || '#FFFFFF',
        },
        errorCorrectionLevel: errorCorrectionLevel.toLowerCase(),
      };

      // Generate unique filename
      const filename = `qr-${questionnaireId}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.png`;
      const imagePath = path.join(this.uploadDir, filename);

      // Generate QR code image
      await QRCode.toFile(imagePath, qrData, qrOptions);

      // Generate relative path for storage
      const relativePath = `uploads/qr-codes/${filename}`;

      logger.info(`Generated QR code for questionnaire ${questionnaireId}: ${relativePath}`);

      return {
        data: qrData,
        imagePath: relativePath,
        filename,
      };
    } catch (error) {
      logger.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code as data URL (for API responses)
   * @param {Object} options - QR code generation options
   * @returns {string} Data URL of QR code image
   */
  async generateQRCodeDataURL(options) {
    try {
      const {
        questionnaireId,
        customColors = {},
        size = 200,
        errorCorrectionLevel = 'M',
      } = options;

      // Generate QR code data
      const qrData = this.generateQRData(questionnaireId);

      // QR code generation options
      const qrOptions = {
        width: size,
        margin: 1,
        color: {
          dark: customColors.foreground || '#000000',
          light: customColors.background || '#FFFFFF',
        },
        errorCorrectionLevel: errorCorrectionLevel.toLowerCase(),
      };

      // Generate QR code as data URL
      const dataURL = await QRCode.toDataURL(qrData, qrOptions);

      return dataURL;
    } catch (error) {
      logger.error('Error generating QR code data URL:', error);
      throw new Error('Failed to generate QR code data URL');
    }
  }

  /**
   * Validate QR code options
   * @param {Object} options - QR code options to validate
   * @returns {Object} Validation result
   */
  validateOptions(options) {
    const errors = [];

    // Validate size
    if (options.size && (options.size < 50 || options.size > 1000)) {
      errors.push('Size must be between 50 and 1000 pixels');
    }

    // Validate error correction level
    const validErrorLevels = ['L', 'M', 'Q', 'H'];
    if (options.errorCorrectionLevel && !validErrorLevels.includes(options.errorCorrectionLevel)) {
      errors.push('Error correction level must be one of: L, M, Q, H');
    }

    // Validate custom colors
    if (options.customColors) {
      const colorRegex = /^#[0-9A-Fa-f]{6}$/;

      if (options.customColors.foreground && !colorRegex.test(options.customColors.foreground)) {
        errors.push('Foreground color must be a valid hex color (e.g., #000000)');
      }

      if (options.customColors.background && !colorRegex.test(options.customColors.background)) {
        errors.push('Background color must be a valid hex color (e.g., #FFFFFF)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Delete QR code image file
   * @param {string} imagePath - Relative path to image file
   * @returns {boolean} True if deleted successfully
   */
  async deleteQRCodeImage(imagePath) {
    try {
      if (!imagePath) return true;

      const fullPath = path.join(__dirname, '../../', imagePath);
      await fs.unlink(fullPath);

      logger.info(`Deleted QR code image: ${imagePath}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting QR code image ${imagePath}:`, error);
      return false;
    }
  }

  /**
   * Clean up orphaned QR code images
   * @param {Array} activeImagePaths - Array of active image paths
   * @returns {number} Number of cleaned up files
   */
  async cleanupOrphanedImages(activeImagePaths = []) {
    try {
      const files = await fs.readdir(this.uploadDir);
      let cleanedCount = 0;

      // Process file deletions in parallel
      const deletePromises = files
        .filter(file => {
          const relativePath = `uploads/qr-codes/${file}`;
          return !activeImagePaths.includes(relativePath);
        })
        .map(async (file) => {
          const fullPath = path.join(this.uploadDir, file);
          await fs.unlink(fullPath);
          return 1; // Count each deleted file
        });

      const deletedCounts = await Promise.all(deletePromises);
      cleanedCount = deletedCounts.reduce((sum, count) => sum + count, 0);

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} orphaned QR code images`);
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up orphaned QR code images:', error);
      return 0;
    }
  }

  /**
   * Get QR code image info
   * @param {string} imagePath - Relative path to image file
   * @returns {Object} Image information
   */
  async getImageInfo(imagePath) {
    try {
      if (!imagePath) return null;

      const fullPath = path.join(__dirname, '../../', imagePath);
      const stats = await fs.stat(fullPath);

      return {
        path: imagePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        exists: true,
      };
    } catch (error) {
      return {
        path: imagePath,
        exists: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate QR code with logo overlay
   * @param {Object} options - QR code generation options
   * @param {string} logoPath - Path to logo image
   * @returns {Object} Generated QR code with logo
   */
  async generateQRCodeWithLogo(options, logoPath) {
    try {
      // This is a placeholder for logo functionality
      // In a real implementation, you would use a library like
      // sharp or jimp to overlay the logo on the QR code

      // For now, just generate a regular QR code
      const result = await this.generateQRCode(options);

      logger.info(
        `Generated QR code with logo placeholder for questionnaire ${options.questionnaireId}`,
      );

      return {
        ...result,
        hasLogo: !!logoPath,
        logoPath,
      };
    } catch (error) {
      logger.error('Error generating QR code with logo:', error);
      throw new Error('Failed to generate QR code with logo');
    }
  }

  /**
   * Batch generate QR codes for multiple locations
   * @param {number} questionnaireId - Questionnaire ID
   * @param {Array} locations - Array of location objects
   * @param {Object} baseOptions - Base QR code options
   * @returns {Array} Array of generated QR codes
   */
  async batchGenerateQRCodes(questionnaireId, locations, baseOptions = {}) {
    try {
      // Process QR code generation in parallel
      const qrPromises = locations.map(async (location) => {
        const options = {
          ...baseOptions,
          questionnaireId,
          locationTag: location.name,
        };

        const qrCode = await this.generateQRCode(options);
        return {
          location: location.name,
          ...qrCode,
        };
      });

      const results = await Promise.all(qrPromises);

      logger.info(
        `Batch generated ${results.length} QR codes for questionnaire ${questionnaireId}`,
      );

      return results;
    } catch (error) {
      logger.error('Error batch generating QR codes:', error);
      throw new Error('Failed to batch generate QR codes');
    }
  }
}

module.exports = QRCodeService;
