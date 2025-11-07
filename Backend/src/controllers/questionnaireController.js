'use strict';

const { Questionnaire, Question, User, QRCode, Response, Answer } = require('../models');
const {
  validateQuestionnaireOwnership,
  validateQuestionnaireCreate,
  validateQuestionnaireUpdate,
  validateQuestionnaireList,
  validateIdParam,
} = require('../middleware/validation');
const logger = require('../utils/logger');

/**
 * Questionnaire Controller
 * Handles all questionnaire-related API endpoints
 */

/**
 * GET /api/v1/questionnaires
 * Get paginated list of user's questionnaires with subscription limits
 */
const getQuestionnaires = async (req, res) => {
  try {
    const { page = 1, limit = 10, includeInactive = false, category, dateFrom, dateTo } = req.query;
    const userId = req.user.id;

    // Get user's subscription plan from user model
    const user = await User.findByPk(userId);
    const subscriptionPlan = user?.subscription_plan || 'free';

    // Get paginated questionnaires
    const result = await Questionnaire.findByUserPaginated(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      includeInactive: includeInactive === 'true',
      category,
      dateFrom,
      dateTo,
    });

    // Get subscription quota information
    const quotaInfo = await Questionnaire.checkUserQuota(userId, subscriptionPlan);

    res.json({
      success: true,
      data: {
        questionnaires: result.questionnaires,
        pagination: result.pagination,
        usage: quotaInfo,
      },
    });

    logger.info(`User ${userId} retrieved ${result.questionnaires.length} questionnaires`);
  } catch (error) {
    logger.error('Error getting questionnaires:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to retrieve questionnaires',
      },
    });
  }
};

/**
 * GET /api/v1/questionnaires/:id
 * Get a single questionnaire by ID
 */
const getQuestionnaireById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const questionnaire = await Questionnaire.findByPk(id, {
      include: [
        {
          model: Question,
          as: 'questions',
          where: { isActive: true },
          required: false,
          order: [['orderIndex', 'ASC']],
        },
      ],
    });

    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        },
      });
    }

    // Check ownership - return 404 for security (don't reveal resource exists)
    if (questionnaire.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        },
      });
    }

    res.json({
      success: true,
      data: questionnaire.toJSON(),
    });

    logger.info(`User ${userId} retrieved questionnaire ${id}`);
  } catch (error) {
    logger.error('Error getting questionnaire by ID:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to retrieve questionnaire',
      },
    });
  }
};

/**
 * POST /api/v1/questionnaires
 * Create a new questionnaire
 */
const createQuestionnaire = async (req, res) => {
  try {
    const userId = req.user.id;
    const { questions, ...questionnaireFields } = req.body;
    const questionnaireData = { ...questionnaireFields, userId };

    // Create questionnaire (subscription validation handled by middleware)
    const questionnaire = await Questionnaire.create(questionnaireData);

    // Create questions if provided
    if (questions && questions.length > 0) {
      console.log('Creating questions:', questions.length);
      const questionData = questions.map(q => ({ ...q, questionnaireId: questionnaire.id }));
      console.log('Question data:', questionData);
      await Question.bulkCreate(questionData);
      console.log('Questions created successfully');
    }

    res.status(201).json({
      success: true,
      data: questionnaire.toSummaryJSON(),
    });

    logger.info(`User ${userId} created questionnaire ${questionnaire.id}`);
  } catch (error) {
    logger.error('Error creating questionnaire:', error);

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
          message: 'Questionnaire validation failed',
          details: validationErrors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Validation failed',
      },
    });
  }
};

/**
 * PUT /api/v1/questionnaires/:id
 * Update an existing questionnaire
 */
const updateQuestionnaire = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    console.log(`🔧 Update questionnaire request: ID=${id}, User=${userId}`);

    // Find questionnaire
    const questionnaire = await Questionnaire.findByPk(id);
    if (!questionnaire) {
      console.log(`❌ Questionnaire not found: ${id}`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        },
      });
    }

    console.log(`📋 Found questionnaire: owner=${questionnaire.userId}, requester=${userId}`);

    // Check ownership - return 404 for security (don't reveal resource exists)
    if (!validateQuestionnaireOwnership(questionnaire, userId)) {
      console.log(`❌ Ownership check failed: questionnaire.userId=${questionnaire.userId}, userId=${userId}`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        },
      });
    }

    // Update questionnaire
    const [updateCount] = await Questionnaire.update(
      {
        title: updateData.title,
        description: updateData.description,
        isActive: updateData.isActive,
      },
      {
        where: { id, userId },
      },
    );

    if (updateCount === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        },
      });
    }

    // Refetch the updated questionnaire
    const updatedQuestionnaire = await Questionnaire.findByPk(id);

    res.json({
      success: true,
      data: updatedQuestionnaire.toSummaryJSON(),
    });

    logger.info(`User ${userId} updated questionnaire ${id}`);
  } catch (error) {
    logger.error('Error updating questionnaire:', error);

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
          message: 'Questionnaire validation failed',
          details: validationErrors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to update questionnaire',
      },
    });
  }
};

/**
 * DELETE /api/v1/questionnaires/:id
 * Delete a questionnaire (soft delete with cascade)
 */
const deleteQuestionnaire = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`🗑️ Delete questionnaire request: ID=${id}, User=${userId}`);

    // Find questionnaire with associations
    const questionnaire = await Questionnaire.findByPk(id, {
      include: [
        { model: Question, as: 'questions' },
        { model: QRCode, as: 'qrCodes' },
      ],
    });

    if (!questionnaire) {
      console.log(`❌ Questionnaire not found for deletion: ${id}`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        },
      });
    }

    console.log(`📋 Found questionnaire for deletion: owner=${questionnaire.userId}, requester=${userId}`);

    // Check ownership - return 404 for security (don't reveal resource exists)
    if (!validateQuestionnaireOwnership(questionnaire, userId)) {
      console.log(`❌ Ownership check failed for deletion: questionnaire.userId=${questionnaire.userId}, userId=${userId}`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        },
      });
    }

    // Check if questionnaire has responses
    const responseCount = await Response.count({
      where: { questionnaireId: id },
    });

    console.log(`📊 Response count for questionnaire ${id}: ${responseCount}`);

    if (responseCount > 0) {
      console.log(`❌ Cannot delete questionnaire ${id}: has ${responseCount} responses`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'BUSINESS_ERROR',
          message: 'Cannot delete questionnaire with existing responses',
          details: {
            responseCount,
          },
        },
      });
    }

    console.log(`🗑️ Proceeding to delete questionnaire ${id}`);
    // Soft delete questionnaire (cascade will handle related records)
    await questionnaire.destroy();

    res.json({
      success: true,
      data: {
        id: questionnaire.id,
        message: 'Questionnaire deleted successfully',
      },
    });

    logger.info(`User ${userId} deleted questionnaire ${id}`);
    console.log(`✅ Successfully deleted questionnaire ${id}`);
  } catch (error) {
    console.error('Error deleting questionnaire:', error);
    logger.error('Error deleting questionnaire:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to delete questionnaire',
        details: error.message,
      },
    });
  }
};

/**
 * GET /api/v1/questionnaires/:id/statistics
 * Get statistics for a specific questionnaire
 */
const getQuestionnaireStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find questionnaire
    const questionnaire = await Questionnaire.findByPk(id);
    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        },
      });
    }

    // Check ownership - return 404 for security (don't reveal resource exists)
    if (!validateQuestionnaireOwnership(questionnaire, userId)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        },
      });
    }

    // Get response statistics
    const responseStats = await Response.getStatistics(id);

    // Get question statistics
    const questions = await Question.findAll({
      where: { questionnaireId: id, isActive: true },
      attributes: ['id', 'questionText', 'questionType', 'category'],
    });

    const questionStats = await Promise.all(
      questions.map(async (question) => {
        const stats = await Answer.getStatistics(question.id);
        return {
          questionId: question.id,
          questionText: question.questionText,
          questionType: question.questionType,
          category: question.category,
          stats,
        };
      }),
    );

    // Get QR code statistics
    const qrStats = await QRCode.getScanStatistics(id);

    res.json({
      success: true,
      data: {
        questionnaire: questionnaire.toSummaryJSON(),
        responseStatistics: responseStats,
        questionStatistics: questionStats,
        qrCodeStatistics: qrStats,
      },
    });

    logger.info(`User ${userId} retrieved statistics for questionnaire ${id}`);
  } catch (error) {
    logger.error('Error getting questionnaire statistics:', error);
    console.error('Detailed error in questionnaire statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to retrieve questionnaire statistics',
        details: process.env.NODE_ENV === 'test' ? error.message : undefined,
      },
    });
  }
};

module.exports = {
  getQuestionnaires: [validateQuestionnaireList, getQuestionnaires],
  getQuestionnaireById: [validateIdParam, getQuestionnaireById],
  createQuestionnaire: [validateQuestionnaireCreate, createQuestionnaire],
  updateQuestionnaire: [validateIdParam, validateQuestionnaireUpdate, updateQuestionnaire],
  deleteQuestionnaire: [validateIdParam, deleteQuestionnaire],
  getQuestionnaireStatistics: [validateIdParam, getQuestionnaireStatistics],
};
