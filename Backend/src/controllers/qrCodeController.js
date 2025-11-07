'use strict';

const { QRCode, Questionnaire } = require('../models');
const {
  validateQRCodeOwnership,
  validateQRCodeCreate,
  validateQRCodeUpdate,
  validateQRCodeList,
  validateIdParam,
} = require('../middleware/validation');
const logger = require('../utils/logger');
const QRCodeService = require('../services/qrCodeService');
const {
  upload,
  fileSecurityMiddleware,
  uploadRateLimitMiddleware,
  generateFileUrl,
  cleanupFile,
  cleanupUserDirectory,
  // cdnIntegration, // Imported for future use
} = require('../middleware/upload');

/**
 * QR Code Controller
 * Handles all QR code-related API endpoints
 */

/**
 * GET /api/v1/qr-codes
 * Get paginated list of user's QR codes with filtering
 */
const getQRCodes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      questionnaireId,
      locationTag,
      includeInactive = false,
      onlyValid = false,
    } = req.query;
    const userId = req.user.id;

    // Build query options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      includeInactive: includeInactive === 'true',
      onlyValid: onlyValid === 'true',
    };

    if (questionnaireId) {
      options.questionnaireId = parseInt(questionnaireId);
    }

    if (locationTag) {
      options.locationTag = locationTag;
    }

    // Get QR codes with questionnaire filtering
    let qrCodes;
    if (options.questionnaireId) {
      // Verify user owns the questionnaire
      const questionnaire = await Questionnaire.findByPk(options.questionnaireId);
      if (!questionnaire || questionnaire.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied to this questionnaire',
          },
        });
      }
      qrCodes = await QRCode.findByQuestionnaire(options.questionnaireId, options);
    } else {
      // Get all QR codes for user's questionnaires
      const userQuestionnaires = await Questionnaire.findAll({
        where: { userId },
        attributes: ['id'],
      });

      const questionnaireIds = userQuestionnaires.map((q) => q.id);
      qrCodes = await QRCode.findAll({
        where: {
          questionnaireId: questionnaireIds,
          ...(options.includeInactive ? {} : { isActive: true }),
        },
        include: [
          {
            model: Questionnaire,
            as: 'questionnaire',
            attributes: ['id', 'title'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: options.limit,
        offset: (options.page - 1) * options.limit,
      });
    }

    // Filter by location tag if specified
    if (options.locationTag) {
      qrCodes = qrCodes.filter((qr) => qr.locationTag === options.locationTag);
    }

    // Filter only valid QR codes if requested
    if (options.onlyValid) {
      qrCodes = qrCodes.filter((qr) => qr.isValid());
    }

    // Get total count for pagination
    const totalCount = qrCodes.length;

    res.json({
      success: true,
      data: {
        qrCodes: qrCodes.map((qr) => qr.toSummaryJSON()),
        pagination: {
          page: options.page,
          limit: options.limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / options.limit),
        },
      },
    });

    logger.info(`User ${userId} retrieved ${qrCodes.length} QR codes`);
  } catch (error) {
    logger.error('Error getting QR codes:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to retrieve QR codes',
      },
    });
  }
};

/**
 * GET /api/v1/qr-codes/:id
 * Get a single QR code by ID
 */
const getQRCodeById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const qrCode = await QRCode.findByPk(id, {
      include: [
        {
          model: Questionnaire,
          as: 'questionnaire',
          attributes: ['id', 'userId'],
        },
      ],
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'QR code not found' },
      });
    }

    // Check ownership through questionnaire
    if (qrCode.questionnaire.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' },
      });
    }

    res.json({
      success: true,
      data: qrCode.toJSON(),
    });

    logger.info(`User ${userId} retrieved QR code ${id}`);
  } catch (error) {
    logger.error('Error getting QR code by ID:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to retrieve QR code',
      },
    });
  }
};

/**
 * POST /api/v1/qr-codes
 * Create a new QR code
 */
const createQRCode = async (req, res) => {
  try {
    const userId = req.user.id;
    const qrCodeData = req.body;

    // Handle logo upload if present
    let logoUrl = null;
    if (req.file) {
      logoUrl = generateFileUrl(req.file.filename, userId);
    }

    // Verify user owns the questionnaire
    const questionnaire = await Questionnaire.findByPk(qrCodeData.questionnaireId);
    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        },
      });
    }

    if (questionnaire.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this questionnaire',
        },
      });
    }

    // Generate QR code data and image
    const qrCodeService = new QRCodeService();
    const generatedQR = await qrCodeService.generateQRCode({
      questionnaireId: qrCodeData.questionnaireId,
      locationTag: qrCodeData.locationTag,
      customColors: qrCodeData.customColors,
      size: qrCodeData.size,
      errorCorrectionLevel: qrCodeData.errorCorrectionLevel,
    });

    // Create QR code record
    const qrCode = await QRCode.create({
      questionnaireId: qrCodeData.questionnaireId,
      qrCodeData: generatedQR.data,
      qrCodeImage: generatedQR.imagePath,
      locationTag: qrCodeData.locationTag,
      logoUrl,
      customColors: qrCodeData.customColors,
      size: qrCodeData.size,
      errorCorrectionLevel: qrCodeData.errorCorrectionLevel,
      expiresAt: qrCodeData.expiresAt,
      settings: qrCodeData.settings,
    });

    res.status(201).json({
      success: true,
      data: qrCode.toSummaryJSON(),
    });

    logger.info(
      `User ${userId} created QR code ${qrCode.id} for questionnaire ${qrCodeData.questionnaireId}`,
    );
  } catch (error) {
    logger.error('Error creating QR code:', error);

    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'QR code validation failed',
          details: validationErrors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to create QR code',
      },
    });
  }
};

/**
 * PUT /api/v1/qr-codes/:id
 * Update an existing QR code
 */
const updateQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Handle logo upload if present
    let logoUrl = null;
    if (req.file) {
      logoUrl = generateFileUrl(req.file.filename, userId);
      updateData.logoUrl = logoUrl;
    }

    // Find QR code with questionnaire
    const qrCode = await QRCode.findByPk(id, {
      include: [
        {
          model: Questionnaire,
          as: 'questionnaire',
          attributes: ['id', 'title', 'userId'],
        },
      ],
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'QR code not found',
        },
      });
    }

    // Check ownership
    if (!validateQRCodeOwnership(qrCode, userId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this QR code',
        },
      });
    }

    // Regenerate QR code if visual properties changed
    if (updateData.customColors || updateData.size || updateData.errorCorrectionLevel) {
      const qrCodeService = new QRCodeService();
      const generatedQR = await qrCodeService.generateQRCode({
        questionnaireId: qrCode.questionnaireId,
        locationTag: updateData.locationTag || qrCode.locationTag,
        customColors: updateData.customColors || qrCode.customColors,
        size: updateData.size || qrCode.size,
        errorCorrectionLevel: updateData.errorCorrectionLevel || qrCode.errorCorrectionLevel,
      });

      updateData.qrCodeImage = generatedQR.imagePath;
    }

    // Update QR code
    await qrCode.update(updateData);

    res.json({
      success: true,
      data: qrCode.toSummaryJSON(),
    });

    logger.info(`User ${userId} updated QR code ${id}`);
  } catch (error) {
    logger.error('Error updating QR code:', error);

    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'QR code validation failed',
          details: validationErrors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to update QR code',
      },
    });
  }
};

/**
 * DELETE /api/v1/qr-codes/:id
 * Delete a QR code (soft delete)
 */
const deleteQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find QR code with questionnaire
    const qrCode = await QRCode.findByPk(id, {
      include: [
        {
          model: Questionnaire,
          as: 'questionnaire',
          attributes: ['id', 'title', 'userId'],
        },
      ],
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'QR code not found',
        },
      });
    }

    // Check ownership
    if (!validateQRCodeOwnership(qrCode, userId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this QR code',
        },
      });
    }

    // Clean up logo file if exists
    if (qrCode.logoUrl) {
      const filename = qrCode.logoUrl.split('/').pop();
      const filePath = require('path').join(
        process.cwd(),
        'uploads/qr-logos',
        userId.toString(),
        filename,
      );
      await cleanupFile(filePath);
      await cleanupUserDirectory(userId);
    }

    // Soft delete QR code
    await qrCode.destroy();

    res.json({
      success: true,
      data: {
        id: qrCode.id,
        message: 'QR code deleted successfully',
      },
    });

    logger.info(`User ${userId} deleted QR code ${id}`);
  } catch (error) {
    logger.error('Error deleting QR code:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to delete QR code',
      },
    });
  }
};

/**
 * POST /api/v1/qr-codes/:id/scan
 * Record a QR code scan (for tracking)
 */
const recordQRCodeScan = async (req, res) => {
  try {
    const { id } = req.params;
    // eslint-disable-next-line no-unused-vars
    const { deviceFingerprint: _deviceFingerprint, ipAddress: _ipAddress, userAgent: _userAgent } = req.body;

    const qrCode = await QRCode.findByPk(id);
    if (!qrCode) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'QR code not found',
        },
      });
    }

    // Check if QR code is valid
    if (!qrCode.isValid()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QR_CODE',
          message: 'QR code is inactive or expired',
        },
      });
    }

    // Check if this is a unique scan (simplified check)
    const isUnique = true; // In production, implement proper unique tracking

    // Increment scan count
    await qrCode.incrementScan(isUnique);

    res.json({
      success: true,
      data: {
        questionnaireId: qrCode.questionnaireId,
        scanCount: qrCode.scanCount,
        uniqueScans: qrCode.uniqueScans,
      },
    });

    logger.info(`QR code ${id} scanned. Total scans: ${qrCode.scanCount}`);
  } catch (error) {
    logger.error('Error recording QR code scan:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to record QR code scan',
      },
    });
  }
};

/**
 * GET /api/v1/qr-codes/statistics
 * Get QR code statistics for user
 */
const getQRCodeStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionnaireId } = req.query;

    // Get user's questionnaires
    const whereClause = { userId };
    if (questionnaireId) {
      whereClause.id = parseInt(questionnaireId);
    }

    const userQuestionnaires = await Questionnaire.findAll({
      where: whereClause,
      attributes: ['id'],
    });

    const questionnaireIds = userQuestionnaires.map((q) => q.id);

    // Get overall statistics
    const overallStats = await QRCode.getScanStatistics();

    // Get per-questionnaire statistics
    const perQuestionnaireStats = await Promise.all(
      questionnaireIds.map(async (qId) => {
        const stats = await QRCode.getScanStatistics(qId);
        const questionnaire = await Questionnaire.findByPk(qId, {
          attributes: ['id', 'title'],
        });
        return {
          questionnaireId: qId,
          questionnaireTitle: questionnaire?.title || 'Unknown',
          ...stats,
        };
      }),
    );

    res.json({
      success: true,
      data: {
        overall: overallStats,
        byQuestionnaire: perQuestionnaireStats,
      },
    });

    logger.info(`User ${userId} retrieved QR code statistics`);
  } catch (error) {
    logger.error('Error getting QR code statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to retrieve QR code statistics',
      },
    });
  }
};

/**
 * POST /api/v1/qr-codes/:id/upload-logo
 * Upload logo for QR code
 */
const uploadQRCodeLogo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find QR code with questionnaire
    const qrCode = await QRCode.findByPk(id, {
      include: [
        {
          model: Questionnaire,
          as: 'questionnaire',
          attributes: ['id', 'title', 'userId'],
        },
      ],
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'QR code not found',
        },
      });
    }

    // Check ownership
    if (!validateQRCodeOwnership(qrCode, userId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this QR code',
        },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No file uploaded',
        },
      });
    }

    // Clean up old logo if exists
    if (qrCode.logoUrl) {
      const oldFilename = qrCode.logoUrl.split('/').pop();
      const oldFilePath = require('path').join(
        process.cwd(),
        'uploads/qr-logos',
        userId.toString(),
        oldFilename,
      );
      await cleanupFile(oldFilePath);
    }

    // Generate new logo URL
    const logoUrl = generateFileUrl(req.file.filename, userId);

    // Update QR code with new logo
    logger.info(`Updating QR code ${id} with logoUrl: ${logoUrl}`);
    logger.info('QR code instance before update:', qrCode.toJSON());

    try {
      // Use update method instead of save for better transaction handling
      await qrCode.update({ logoUrl });
      logger.info('Update completed successfully');
    } catch (error) {
      logger.error(`Failed to update QR code ${id}:`, error);
      throw error;
    }

    // Verify the update by fetching fresh from database
    const updatedQRCode = await QRCode.findByPk(id);
    logger.info(`QR code ${id} after update - logoUrl: ${updatedQRCode.logoUrl}`);

    res.json({
      success: true,
      data: {
        id: qrCode.id,
        logoUrl,
        message: 'Logo uploaded successfully',
      },
    });

    logger.info(`User ${userId} uploaded logo for QR code ${id}`);
  } catch (error) {
    logger.error('Error uploading QR code logo:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to upload logo',
      },
    });
  }
};

/**
 * DELETE /api/v1/qr-codes/:id/logo
 * Remove logo from QR code
 */
const removeQRCodeLogo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find QR code with questionnaire
    const qrCode = await QRCode.findByPk(id, {
      include: [
        {
          model: Questionnaire,
          as: 'questionnaire',
          attributes: ['id', 'title', 'userId'],
        },
      ],
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'QR code not found',
        },
      });
    }

    // Check ownership
    if (!validateQRCodeOwnership(qrCode, userId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this QR code',
        },
      });
    }

    logger.info(`Checking logo for QR code ${id}: logoUrl = ${qrCode.logoUrl}`);
    if (!qrCode.logoUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_LOGO',
          message: 'No logo to remove',
        },
      });
    }

    // Clean up logo file
    const filename = qrCode.logoUrl.split('/').pop();
    const filePath = require('path').join(
      process.cwd(),
      'uploads/qr-logos',
      userId.toString(),
      filename,
    );
    await cleanupFile(filePath);
    await cleanupUserDirectory(userId);

    // Remove logo URL from QR code
    await qrCode.update({ logoUrl: null });

    res.json({
      success: true,
      data: {
        id: qrCode.id,
        message: 'Logo removed successfully',
      },
    });

    logger.info(`User ${userId} removed logo from QR code ${id}`);
  } catch (error) {
    logger.error('Error removing QR code logo:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to remove logo',
      },
    });
  }
};

module.exports = {
  getQRCodes: [validateQRCodeList, getQRCodes],
  getQRCodeById: [validateIdParam, getQRCodeById],
  createQRCode: [
    uploadRateLimitMiddleware,
    upload.single('logo'),
    fileSecurityMiddleware,
    validateQRCodeCreate,
    createQRCode,
  ],
  updateQRCode: [
    validateIdParam,
    uploadRateLimitMiddleware,
    upload.single('logo'),
    fileSecurityMiddleware,
    validateQRCodeUpdate,
    updateQRCode,
  ],
  deleteQRCode: [validateIdParam, deleteQRCode],
  recordQRCodeScan: [validateIdParam, recordQRCodeScan],
  getQRCodeStatistics: [getQRCodeStatistics],
  uploadQRCodeLogo: [
    validateIdParam,
    uploadRateLimitMiddleware,
    upload.single('logo'),
    fileSecurityMiddleware,
    uploadQRCodeLogo,
  ],
  removeQRCodeLogo: [validateIdParam, removeQRCodeLogo],
};
