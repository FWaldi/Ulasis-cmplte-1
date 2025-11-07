'use strict';

const { Question, Questionnaire, Answer } = require('../models');
const {
  validateQuestionOwnership,
  validateQuestionCreate,
  validateQuestionUpdate,
  validateQuestionReorder,
  validateIdParam,
} = require('../middleware/validation');
const logger = require('../utils/logger');

/**
 * Question Controller
 * Handles all question-related API endpoints
 */

/**
 * GET /api/v1/questionnaires/:id/questions
 * Get questions for a specific questionnaire
 */
const getQuestionsByQuestionnaire = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { includeInactive = false, page = 1, limit = 10, category, type } = req.query;

    // Verify user owns the questionnaire
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

    if (questionnaire.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this questionnaire',
        },
      });
    }

    // Get questions for the questionnaire
    const questions = await Question.findByQuestionnaireOrdered(id, {
      includeInactive: includeInactive === 'true',
      category,
      type,
    });

    // Add pagination metadata
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: questions.length,
      pages: Math.ceil(questions.length / parseInt(limit)),
    };

    // Ensure consistent response format
    res.json({
      success: true,
      data: {
        questionnaireId: parseInt(id),
        questions: questions.map(q => q.toJSON()),
        pagination,
      },
    });

    logger.info(`User ${userId} retrieved ${questions.length} questions for questionnaire ${id}`);
  } catch (error) {
    logger.error('Error getting questions by questionnaire:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to retrieve questions',
      },
    });
  }
};

/**
 * GET /api/v1/questions/:id
 * Get a specific question by ID
 */
const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const question = await Question.findByPk(id, {
      include: [
        {
          model: Questionnaire,
          as: 'questionnaire',
          attributes: ['id', 'title', 'userId'],
        },
      ],
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Question not found',
        },
      });
    }

    // Check ownership through questionnaire
    if (!validateQuestionOwnership(question, userId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this question',
        },
      });
    }

    res.json({
      success: true,
      data: question.toJSON(),
    });

    logger.info(`User ${userId} retrieved question ${id}`);
  } catch (error) {
    logger.error('Error getting question by ID:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to retrieve question',
      },
    });
  }
};

/**
 * POST /api/v1/questionnaires/:id/questions
 * Create a new question for a questionnaire
 */
const createQuestion = async (req, res) => {
  try {
    const { id: questionnaireId } = req.params;
    const userId = req.user.id;
    const questionData = req.body;

    // Verify user owns questionnaire
    const questionnaire = await Questionnaire.findByPk(questionnaireId);
    if (!questionnaire) {
      console.log('🔍 Question controller: Returning 404 - Questionnaire not found');
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

    if (questionnaire.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this questionnaire',
        },
      });
    }

    // Set questionnaire ID and get next order index if not provided
    questionData.questionnaireId = questionnaireId;
    if (questionData.orderIndex === undefined) {
      questionData.orderIndex = await Question.getNextOrderIndex(questionnaireId);
    }

    const question = await Question.create(questionData);

    // Validate question configuration
    const validation = question.validateConfiguration();
    if (!validation.isValid) {
      // If validation fails, delete the question and return error
      await question.destroy();
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Question configuration is invalid',
          details: validation.errors,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: question.toSummaryJSON(),
    });

    logger.info(
      `User ${userId} created question ${question.id} for questionnaire ${questionnaireId}`,
    );
  } catch (error) {
    logger.error('Error creating question:', error);

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
          message: 'Question validation failed',
          details: validationErrors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to create question',
      },
    });
  }
};

/**
 * PUT /api/v1/questions/:id
 * Update an existing question
 */
const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Find question with questionnaire
    const question = await Question.findByPk(id, {
      include: [
        {
          model: Questionnaire,
          as: 'questionnaire',
          attributes: ['id', 'title', 'userId'],
        },
      ],
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Question not found',
        },
      });
    }

    // Check ownership
    if (!validateQuestionOwnership(question, userId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this question',
        },
      });
    }

    // Update question
    await question.update(updateData);

    // Validate updated question configuration
    const validation = question.validateConfiguration();
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Question configuration is invalid',
          details: validation.errors,
        },
      });
    }

    res.json({
      success: true,
      data: question.toSummaryJSON(),
    });

    logger.info(`User ${userId} updated question ${id}`);
  } catch (error) {
    logger.error('Error updating question:', error);

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
          message: 'Question validation failed',
          details: validationErrors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to update question',
      },
    });
  }
};

/**
 * DELETE /api/v1/questions/:id
 * Delete a question (soft delete with answer cleanup)
 */
const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find question with questionnaire and answers
    const question = await Question.findByPk(id, {
      include: [
        {
          model: Questionnaire,
          as: 'questionnaire',
          attributes: ['id', 'title', 'userId'],
        },
        {
          model: require('../models').Answer,
          as: 'answers',
          attributes: ['id'],
        },
      ],
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Question not found',
        },
      });
    }

    // Check ownership
    if (!validateQuestionOwnership(question, userId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this question',
        },
      });
    }

    // Check if question has answers
    if (question.answers && question.answers.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BUSINESS_ERROR',
          message: 'Cannot delete question with existing responses',
          details: {
            answerCount: question.answers.length,
          },
        },
      });
    }

    // Soft delete question
    await question.destroy();

    res.status(204).send();

    logger.info(`User ${userId} deleted question ${id}`);
  } catch (error) {
    console.error('Error deleting question:', error);
    logger.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to delete question',
        details: error.message,
      },
    });
  }
};

/**
 * PUT /api/v1/questionnaires/:id/questions/reorder
 * Reorder questions in a questionnaire
 */
const reorderQuestions = async (req, res) => {
  try {
    const { id: questionnaireId } = req.params;
    const userId = req.user.id;
    const { questionOrders } = req.body;

    // Verify user owns the questionnaire
    const questionnaire = await Questionnaire.findByPk(questionnaireId);
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

    // Reorder questions - ensure orderIndex is properly updated
    const updatedQuestions = await Question.reorderQuestions(questionnaireId, questionOrders);

    if (!Array.isArray(updatedQuestions)) {
      logger.error('reorderQuestions did not return an array', { questionnaireId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'Failed to process question reordering correctly.',
        },
      });
    }

    res.json({
      success: true,
      data: {
        questionnaireId: parseInt(questionnaireId),
        questions: updatedQuestions,
        message: 'Questions reordered successfully',
      },
    });

    logger.info(
      `User ${userId} reordered ${updatedQuestions.length} questions in questionnaire ${questionnaireId}`,
    );
  } catch (error) {
    logger.error('Error reordering questions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to reorder questions',
      },
    });
  }
};

/**
 * GET /api/v1/questions/statistics
 * Get question statistics for user's questionnaires
 */
const getQuestionStatistics = async (req, res) => {
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

    // Get all questions for user's questionnaires
    const questions = await Question.findAll({
      where: { questionnaireId: questionnaireIds },
      attributes: [
        'id',
        'questionText',
        'questionType',
        'category',
        'isRequired',
        'isActive',
        'questionnaireId',
      ],
      include: [
        {
          model: Questionnaire,
          as: 'questionnaire',
          attributes: ['id', 'title'],
        },
      ],
    });

    // Get statistics for all questions at once (performance optimization)
    const questionIds = questions.map(q => q.id);
    const batchStats = await require('../models').Answer.getBatchStatistics(questionIds);

    const questionStats = questions.map((question) => {
      return {
        questionId: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        category: question.category,
        isRequired: question.isRequired,
        isActive: question.isActive,
        questionnaireId: question.questionnaireId,
        questionnaireTitle: question.questionnaire?.title || 'Unknown',
        ...batchStats[question.id],
      };
    });

    // Aggregate statistics
    const totalQuestions = questions.length;
    const activeQuestions = questions.filter((q) => q.isActive).length;
    const requiredQuestions = questions.filter((q) => q.isRequired).length;

    const questionsByType = questions.reduce((acc, question) => {
      acc[question.questionType] = (acc[question.questionType] || 0) + 1;
      return acc;
    }, {});

    const questionsByCategory = questions.reduce((acc, question) => {
      const category = question.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Calculate average questions per questionnaire
    const averageQuestionsPerQuestionnaire = questionnaireIds.length > 0
      ? Math.round((totalQuestions / questionnaireIds.length) * 100) / 100
      : 0;

    res.json({
      success: true,
      data: {
        total_questions: totalQuestions,
        questions_by_type: questionsByType,
        questions_by_category: questionsByCategory,
        average_questions_per_questionnaire: averageQuestionsPerQuestionnaire,
        summary: {
          totalQuestions,
          activeQuestions,
          requiredQuestions,
          inactiveQuestions: totalQuestions - activeQuestions,
          questionsByType,
          questionsByCategory,
        },
        byQuestion: questionStats,
      },
    });

    logger.info(`User ${userId} retrieved question statistics`);
  } catch (error) {
    logger.error('Error getting question statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to retrieve question statistics',
      },
    });
  }
};

module.exports = {
  getQuestionsByQuestionnaire: [validateIdParam, getQuestionsByQuestionnaire],
  getQuestionById: [validateIdParam, getQuestionById],
  createQuestion: [validateIdParam, validateQuestionCreate, createQuestion],
  updateQuestion: [validateIdParam, validateQuestionUpdate, updateQuestion],
  deleteQuestion: [validateIdParam, deleteQuestion],
  reorderQuestions: [validateIdParam, validateQuestionReorder, reorderQuestions],
  getQuestionStatistics: [getQuestionStatistics],
};
