'use strict';

const { Response, Answer, Questionnaire, Question } = require('../models');
const { Op } = require('sequelize');
const responseService = require('../services/responseService');
const privacyService = require('../services/privacyService');
const subscriptionService = require('../services/subscriptionService');
const { getQuestionnaireAnalytics, getRealTimeKPIs } = require('../services/analyticsService');
const { updateCategoryMapping, getCategoryMapping, getCategoryPerformance } = require('../services/categoryService');
const qrScanTrackingService = require('../services/qrScanTrackingService');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/errorHandler');

/**
 * Authenticated Response Controller
 * Handles authenticated feedback submission
 */

const submitResponse = async (req, res) => {
  try {
    const { questionnaireId, responses, deviceFingerprint, ipAddress } = req.body;

    // Simple validation
    if (!questionnaireId || !responses) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
      });
    }

    // Verify questionnaire exists and user has access
    const questionnaire = await Questionnaire.findOne({
      where: { id: questionnaireId, userId: req.user.id },
    });

    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Questionnaire not found' },
      });
    }

    // Validate required questions are not skipped (before creating response)
    const requiredQuestions = await Question.findAll({
      where: {
        questionnaireId,
        isRequired: true,
        isActive: true,
      },
      attributes: ['id'],
    });

    const requiredQuestionIds = requiredQuestions.map(q => q.id);

    const skippedRequiredQuestions = responses.filter(
      answer => requiredQuestionIds.includes(answer.questionId) && answer.isSkipped,
    );

    if (skippedRequiredQuestions.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Required questions cannot be skipped',
          details: {
            skipped_required_questions: skippedRequiredQuestions.map(q => q.questionId),
          },
        },
      });
    }

    // Get total questions for this questionnaire (including inactive ones for accurate progress calculation)
    const totalQuestions = await Question.count({
      where: {
        questionnaireId,
      },
    });

    // Create response (initially incomplete, will be updated after answers are created)
    const response = await Response.create({
      questionnaireId,
      responseDate: new Date(),
      deviceFingerprint: deviceFingerprint || req.ip,
      ipAddress: ipAddress || req.ip,
      userAgent: req.get('User-Agent'),
      isComplete: false,
      progressPercentage: 0.0,
    });

    // Create answers
    const answerData = responses.map(answer => ({
      responseId: response.id,
      questionId: answer.questionId,
      ratingScore: answer.ratingScore || null,
      textAnswer: answer.textAnswer || null,
      isSkipped: answer.isSkipped || false,
    }));

    await Answer.bulkCreate(answerData);

    // Update progress based on actual answers
    if (typeof response.updateProgress === 'function') {
      await response.updateProgress(totalQuestions);
    } else {
      // Fallback: calculate progress more accurately
      // Use the higher of database question count or submitted unique question count
      const submittedUniqueQuestions = new Set(responses.map(r => r.questionId)).size;
      const actualTotalQuestions = Math.max(totalQuestions, submittedUniqueQuestions);

      const submittedAnswers = responses.filter(r => !r.isSkipped);
      const answeredCount = submittedAnswers.length;

      let progressPercentage = actualTotalQuestions > 0 ? Math.round((answeredCount / actualTotalQuestions) * 100 * 100) / 100 : 0;
      const isComplete = progressPercentage >= 100;

      // Cap progress at 100% to avoid database constraint issues
      progressPercentage = Math.min(progressPercentage, 100);

      await response.update({
        progressPercentage,
        isComplete,
      });

      // Update the response object with new values for the response
      response.progressPercentage = progressPercentage;
      response.isComplete = isComplete;

      // Debug logging for test failures
      console.log('DEBUG Response Submission:', {
        totalQuestions,
        submittedUniqueQuestions,
        answeredCount,
        progressPercentage,
        isComplete,
      });
    }

    // Increment response usage for subscription tracking
    try {
      await subscriptionService.incrementUsage(req.user.id, 'responses', 1);
    } catch (usageError) {
      logger.warn('Failed to increment response usage:', usageError.message);
      // Don't fail the response submission if usage tracking fails
    }

    // Check if this is a batch submission (multiple responses in array)
    const isBatch = Array.isArray(responses) && responses.length > 1;

    if (isBatch) {
      res.status(201).json({
        success: true,
        data: {
          batch_id: `batch_${Date.now()}_${response.id}`,
          responses_processed: 1,
          response_id: response.id,
          is_complete: response.isComplete,
          progress_percentage: response.progressPercentage,
        },
      });
    } else {
      res.status(201).json({
        success: true,
        data: {
          response_id: response.id,
          is_complete: response.isComplete,
          progress_percentage: response.progressPercentage,
        },
      });
    }
  } catch (error) {
    logger.error('Response submission error', {
      error: error.message,
      userId: req.user?.id,
      body: req.body,
    });

    res.status(500).json({
      success: false,
      error: { code: 'SUBMISSION_ERROR', message: 'Failed to submit response' },
    });
  }
};

/**
 * Anonymous Response Controller
 * Handles anonymous feedback submission without authentication
 */

const submitAnonymousResponse = async (req, res) => {
  try {
    const { questionnaire_id, qr_code_id, answers } = req.body;

    // Simple validation
    if (!questionnaire_id || !answers) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
      });
    }

    // Verify questionnaire exists
    const questionnaire = await Questionnaire.findOne({
      where: { id: questionnaire_id, isActive: true },
    });

    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Questionnaire not found' },
      });
    }

    // Create response
    const response = await Response.create({
      questionnaireId: questionnaire_id,
      qrCodeId: qr_code_id || null,
      responseDate: new Date(),
      deviceFingerprint: req.ip || req.connection.remoteAddress,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      isComplete: true,
      progressPercentage: 100.0,
    });

    // Create answers
    const createdAnswers = await Promise.all(
      answers.map((answer) => Answer.create({
        responseId: response.id,
        questionId: answer.question_id,
        answerValue: answer.answer_value || null,
        ratingScore: answer.rating_score || null,
        selectedOptions: answer.selected_options || [],
        isSkipped: answer.is_skipped || false,
        validationStatus: 'valid',
      }),
      ),
    );

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: {
        response_id: response.id,
        submitted_at: response.createdAt,
        answers_count: createdAnswers.length,
      },
    });
  } catch (error) {
    logger.error('Error submitting anonymous response:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Get anonymous response by ID (public access with limited data)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const getAnonymousResponse = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await Response.findOne({
      where: { id },
      include: [
        {
          model: Answer,
          as: 'answers',
          attributes: ['id', 'questionId', 'answerValue', 'ratingScore', 'isSkipped', 'createdAt'],
          include: [
            {
              model: Question,
              as: 'question',
              attributes: ['id', 'questionText', 'questionType', 'category'],
            },
          ],
        },
      ],
      attributes: ['id', 'questionnaireId', 'qrCodeId', 'responseDate', 'createdAt'],
    });

    if (!response) {
      throw new NotFoundError('Response not found');
    }

    res.json({
      success: true,
      data: response,
    });

  } catch (error) {
    logger.error('Error getting anonymous response:', error);

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: {
          code: error.name,
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Get responses for questionnaire (public aggregated data)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const getQuestionnaireResponses = async (req, res) => {
  try {
    const { questionnaire_id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Verify questionnaire exists and is active
    const questionnaire = await Questionnaire.findOne({
      where: {
        id: questionnaire_id,
        isActive: true,
      },
    });

    if (!questionnaire) {
      throw new NotFoundError('Questionnaire not found or inactive');
    }

    // Get paginated responses (public data only)
    const result = await Response.findByQuestionnairePaginated(questionnaire_id, {
      page: parseInt(page),
      limit: parseInt(limit),
      includeIncomplete: false,
    });

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    logger.error('Error getting questionnaire responses:', error);

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: {
          code: error.name,
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Get analytics for questionnaire (public aggregated data)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const getQuestionnaireAnalyticsHandler = async (req, res) => {
  try {
    const { questionnaire_id } = req.params;
    const { date_from, date_to, group_by = 'day' } = req.query;

    // Verify questionnaire exists and is active
    const questionnaire = await Questionnaire.findOne({
      where: {
        id: questionnaire_id,
        isActive: true,
      },
    });

    if (!questionnaire) {
      throw new NotFoundError('Questionnaire not found or inactive');
    }

    // Get analytics data
    const analytics = await getQuestionnaireAnalytics(questionnaire_id, {
      dateFrom: date_from,
      dateTo: date_to,
      groupBy: group_by,
      includeIncomplete: false,
    });

    res.json({
      success: true,
      data: analytics,
    });

  } catch (error) {
    logger.error('Error getting questionnaire analytics:', error);

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: {
          code: error.name,
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Get real-time KPIs for questionnaire
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const getQuestionnaireKPIs = async (req, res) => {
  try {
    const { questionnaire_id } = req.params;

    // Verify questionnaire exists and is active
    const questionnaire = await Questionnaire.findOne({
      where: {
        id: questionnaire_id,
        isActive: true,
      },
    });

    if (!questionnaire) {
      throw new NotFoundError('Questionnaire not found or inactive');
    }

    // Get real-time KPIs
    const kpis = await getRealTimeKPIs(questionnaire_id);

    res.json({
      success: true,
      data: kpis,
    });

  } catch (error) {
    logger.error('Error getting questionnaire KPIs:', error);

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: {
          code: error.name,
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Update category mapping for questionnaire
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const updateCategoryMappingHandler = async (req, res) => {
  try {
    const { questionnaire_id } = req.params;
    const { categoryMapping } = req.body;

    if (!categoryMapping || typeof categoryMapping !== 'object') {
      throw new ValidationError('Category mapping is required and must be an object');
    }

    // Verify questionnaire exists
    const questionnaire = await Questionnaire.findOne({
      where: { id: questionnaire_id },
    });

    if (!questionnaire) {
      throw new NotFoundError('Questionnaire not found');
    }

    // Update category mapping
    const updatedMapping = await updateCategoryMapping(questionnaire_id, categoryMapping);

    logger.info(`Category mapping updated for questionnaire ${questionnaire_id}`);

    res.json({
      success: true,
      message: 'Category mapping updated successfully',
      data: {
        questionnaireId: questionnaire_id,
        categoryMapping: updatedMapping,
      },
    });

  } catch (error) {
    logger.error('Error updating category mapping:', error);

    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return res.status(400).json({
        success: false,
        error: {
          code: error.name,
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Get category mapping for questionnaire
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const getCategoryMappingHandler = async (req, res) => {
  try {
    const { questionnaire_id } = req.params;

    // Verify questionnaire exists
    const questionnaire = await Questionnaire.findOne({
      where: { id: questionnaire_id },
    });

    if (!questionnaire) {
      throw new NotFoundError('Questionnaire not found');
    }

    // Get category mapping
    const categoryMapping = await getCategoryMapping(questionnaire_id);

    res.json({
      success: true,
      data: {
        questionnaireId: questionnaire_id,
        categoryMapping,
      },
    });

  } catch (error) {
    logger.error('Error getting category mapping:', error);

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: {
          code: error.name,
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Get category performance analytics
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const getCategoryPerformanceHandler = async (req, res) => {
  try {
    const { questionnaire_id } = req.params;
    const { date_from, date_to } = req.query;

    // Verify questionnaire exists
    const questionnaire = await Questionnaire.findOne({
      where: { id: questionnaire_id },
    });

    if (!questionnaire) {
      throw new NotFoundError('Questionnaire not found');
    }

    // Get category performance
    const performance = await getCategoryPerformance(questionnaire_id, {
      dateFrom: date_from,
      dateTo: date_to,
    });

    res.json({
      success: true,
      data: performance,
    });

  } catch (error) {
    logger.error('Error getting category performance:', error);

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: {
          code: error.name,
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Track QR code scan
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const trackQRCodeScan = async (req, res) => {
  try {
    const { qr_code_id } = req.params;

    if (!qr_code_id) {
      throw new ValidationError('QR code ID is required');
    }

    // Track the scan
    const scanResult = await qrScanTrackingService.trackScan(parseInt(qr_code_id), req);

    res.json({
      success: true,
      data: scanResult,
    });

  } catch (error) {
    logger.error('Error tracking QR code scan:', error);

    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return res.status(400).json({
        success: false,
        error: {
          code: error.name,
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Get QR code scan analytics
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const getQRCodeScanAnalytics = async (req, res) => {
  try {
    const { qr_code_id } = req.params;
    const { date_from, date_to, group_by = 'day' } = req.query;

    if (!qr_code_id) {
      throw new ValidationError('QR code ID is required');
    }

    // Get scan analytics
    const analytics = await qrScanTrackingService.getScanAnalytics(parseInt(qr_code_id), {
      dateFrom: date_from,
      dateTo: date_to,
      groupBy: group_by,
    });

    res.json({
      success: true,
      data: analytics,
    });

  } catch (error) {
    logger.error('Error getting QR code scan analytics:', error);

    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return res.status(400).json({
        success: false,
        error: {
          code: error.name,
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Get location performance analytics
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const getLocationPerformance = async (req, res) => {
  try {
    const { location_tag } = req.params;
    const { date_from, date_to } = req.query;

    if (!location_tag) {
      throw new ValidationError('Location tag is required');
    }

    // Get location performance
    const performance = await qrScanTrackingService.getLocationPerformance(location_tag, {
      dateFrom: date_from,
      dateTo: date_to,
    });

    if (!performance) {
      throw new NotFoundError('No data found for this location');
    }

    res.json({
      success: true,
      data: performance,
    });

  } catch (error) {
    logger.error('Error getting location performance:', error);

    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: {
          code: error.name,
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Get top performing locations
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const getTopLocations = async (req, res) => {
  try {
    const { limit = 10, date_from, date_to } = req.query;

    // Get top locations
    const topLocations = await qrScanTrackingService.getTopLocations({
      limit: parseInt(limit),
      dateFrom: date_from,
      dateTo: date_to,
    });

    res.json({
      success: true,
      data: {
        locations: topLocations,
        count: topLocations.length,
      },
    });

  } catch (error) {
    logger.error('Error getting top locations:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Get batch processing status
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const getBatchProcessingStatusHandler = (req, res) => {
  try {
    const status = responseService.getBatchProcessingStatus();

    res.json({
      success: true,
      data: status,
    });

  } catch (error) {
    logger.error('Error getting batch processing status:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Configure batch processing
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const configureBatchProcessingHandler = (req, res) => {
  try {
    const { batchSize, batchTimeout, maxConcurrentBatches } = req.body;

    const config = {};
    if (batchSize !== undefined) config.batchSize = parseInt(batchSize);
    if (batchTimeout !== undefined) config.batchTimeout = parseInt(batchTimeout);
    if (maxConcurrentBatches !== undefined) config.maxConcurrentBatches = parseInt(maxConcurrentBatches);

    const result = responseService.configureBatchProcessing(config);

    logger.info('Batch processing configuration updated by admin:', config);

    res.json({
      success: true,
      message: 'Batch processing configuration updated successfully',
      data: {
        configuration: config,
        result,
      },
    });

  } catch (error) {
    logger.error('Error configuring batch processing:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Get privacy compliance report
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const getPrivacyComplianceReport = async (req, res) => {
  try {
    const report = await privacyService.getPrivacyComplianceReport();

    // Log data access
    privacyService.logDataAccess('privacy_report_access', {
      userId: req.user?.id,
      ipAddress: req.ip,
      resource: 'privacy_compliance_report',
    });

    res.json({
      success: true,
      data: report,
    });

  } catch (error) {
    logger.error('Error getting privacy compliance report:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Validate GDPR compliance
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const validateGDPRCompliance = async (req, res) => {
  try {
    const validation = await privacyService.validateGDPRCompliance();

    // Log data access
    privacyService.logDataAccess('gdpr_validation', {
      userId: req.user?.id,
      ipAddress: req.ip,
      resource: 'gdpr_compliance_validation',
    });

    res.json({
      success: true,
      data: validation,
    });

  } catch (error) {
    logger.error('Error validating GDPR compliance:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Clean up expired data
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const cleanupExpiredData = async (req, res) => {
  try {
    const results = await privacyService.cleanupExpiredData();

    logger.info('Data cleanup performed by admin:', results);

    res.json({
      success: true,
      message: 'Data cleanup completed successfully',
      data: results,
    });

  } catch (error) {
    logger.error('Error cleaning up expired data:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Export data with privacy controls
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const exportDataWithPrivacy = async (req, res) => {
  try {
    const { questionnaire_id, date_from: dateFrom, date_to: dateTo, include_metadata } = req.query;

    const exportOptions = {
      questionnaireId: questionnaire_id ? parseInt(questionnaire_id) : null,
      dateFrom,
      dateTo,
      includeMetadata: include_metadata === 'true',
    };

    const data = await privacyService.exportDataWithPrivacy(exportOptions);

    // Log data export
    privacyService.logDataAccess('data_export', {
      userId: req.user?.id,
      ipAddress: req.ip,
      resource: 'response_data_export',
      recordCount: data.length,
      options: exportOptions,
    });

    res.json({
      success: true,
      data: {
        records: data,
        count: data.length,
        exportOptions,
        exportedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('Error exporting data with privacy controls:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Update privacy settings
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const updatePrivacySettings = (req, res) => {
  try {
    const updatedSettings = privacyService.updatePrivacySettings(req.body);

    logger.info('Privacy settings updated by admin:', updatedSettings);

    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: updatedSettings,
    });

  } catch (error) {
    logger.error('Error updating privacy settings:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Update retention policies
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const updateRetentionPolicies = (req, res) => {
  try {
    const updatedPolicies = privacyService.updateRetentionPolicies(req.body);

    logger.info('Retention policies updated by admin:', updatedPolicies);

    res.json({
      success: true,
      message: 'Retention policies updated successfully',
      data: updatedPolicies,
    });

  } catch (error) {
    logger.error('Error updating retention policies:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Force process all queued responses
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const forceProcessAllQueuedHandler = async (req, res) => {
  try {
    const results = await responseService.forceProcessAllQueued();

    logger.info('Force processed all queued responses:', results);

    res.json({
      success: true,
      message: 'Force processing completed',
      data: results,
    });

  } catch (error) {
    logger.error('Error force processing queued responses:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

/**
 * Get scan statistics summary
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
const getScanStatisticsSummary = async (req, res) => {
  try {
    const { questionnaire_id, date_from, date_to } = req.query;

    // Get scan statistics summary
    const statistics = await qrScanTrackingService.getScanStatisticsSummary({
      questionnaireId: questionnaire_id ? parseInt(questionnaire_id) : null,
      dateFrom: date_from,
      dateTo: date_to,
    });

    res.json({
      success: true,
      data: statistics,
    });

  } catch (error) {
    logger.error('Error getting scan statistics summary:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};

module.exports = {
  submitResponse,
  submitAnonymousResponse,
  getAnonymousResponse,
  getQuestionnaireResponses,
  getQuestionnaireAnalytics: getQuestionnaireAnalyticsHandler,
  getQuestionnaireKPIs,
  updateCategoryMapping: updateCategoryMappingHandler,
  getCategoryMapping: getCategoryMappingHandler,
  getCategoryPerformance: getCategoryPerformanceHandler,
  trackQRCodeScan,
  getQRCodeScanAnalytics,
  getLocationPerformance,
  getTopLocations,
  getScanStatisticsSummary,
  getBatchProcessingStatus: getBatchProcessingStatusHandler,
  configureBatchProcessing: configureBatchProcessingHandler,
  forceProcessAllQueued: forceProcessAllQueuedHandler,
  getPrivacyComplianceReport,
  validateGDPRCompliance,
  cleanupExpiredData,
  exportDataWithPrivacy,
  updatePrivacySettings,
  updateRetentionPolicies,
};