'use strict';

const { DataTypes } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

/**
 * Answer model definition
 * @param {import('sequelize').Sequelize} sequelize - Sequelize instance
 * @returns {import('sequelize').Model} Answer model
 */
module.exports = (sequelize) => {
  const Answer = sequelize.define(
    'Answer',
    {
      id: {
        type: getDataType('BIGINT'),
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for answer',
      },
      responseId: {
        type: getDataType('BIGINT'),
        allowNull: false,
        field: 'response_id',
        comment: 'Foreign key to responses table',
      },
      questionId: {
        type: getDataType('BIGINT'),
        allowNull: false,
        field: 'question_id',
        comment: 'Foreign key to questions table',
      },
      answerValue: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'answer_value',
        comment: 'The actual answer value provided by respondent',
      },
      answerData: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        field: 'answer_data',
        comment: 'Structured answer data for complex question types',
      },
      ratingScore: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'rating_score',
        comment: 'Numeric rating score if applicable',
      },
      selectedOptions: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        field: 'selected_options',
        comment: 'Array of selected options for multiple choice questions',
      },
      fileAttachment: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'file_attachment',
        comment: 'Path to uploaded file attachment',
      },
      fileMetadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        field: 'file_metadata',
        comment: 'Metadata for uploaded files',
      },
      answerTime: {
        type: getDataType('INTEGER'),
        allowNull: true,
        field: 'answer_time',
        comment: 'Time taken to answer this question in seconds',
      },
      isSkipped: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_skipped',
        comment: 'Whether the question was skipped',
      },
      skipReason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'skip_reason',
        comment: 'Reason for skipping the question',
      },
      validationStatus: {
        type: DataTypes.ENUM('valid', 'invalid', 'pending'),
        allowNull: false,
        defaultValue: 'valid',
        field: 'validation_status',
        comment: 'Validation status of the answer',
      },
      validationErrors: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        field: 'validation_errors',
        comment: 'List of validation errors if any',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional answer metadata',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
        comment: 'Timestamp when the answer was created',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
        comment: 'Timestamp when the answer was last updated',
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
        comment: 'Timestamp for soft delete (null if not deleted)',
      },
    },
    {
      tableName: 'answers',
      timestamps: true,
      paranoid: true, // Enable soft deletes
      underscored: true, // Use snake_case for column names
      indexes: [
        {
          fields: ['response_id'],
          name: 'idx_answers_response_id',
        },
        {
          fields: ['question_id'],
          name: 'idx_answers_question_id',
        },
        {
          fields: ['rating_score'],
          name: 'idx_answers_rating_score',
        },
        {
          fields: ['is_skipped'],
          name: 'idx_answers_is_skipped',
        },
        {
          fields: ['validation_status'],
          name: 'idx_answers_validation_status',
        },
        {
          fields: ['created_at'],
          name: 'idx_answers_created_at',
        },
        {
          fields: ['deleted_at'],
          name: 'idx_answers_deleted_at',
        },
        {
          fields: ['response_id', 'question_id'],
          name: 'idx_answers_response_question',
          unique: true,
        },
        {
          fields: ['question_id', 'created_at'],
          name: 'idx_answers_question_date',
        },
        {
          fields: ['question_id', 'rating_score'],
          name: 'idx_answers_question_rating',
        },
        {
          fields: ['question_id', 'validation_status', 'deleted_at'],
          name: 'idx_answers_valid_by_question',
        },
        {
          fields: ['question_id', 'is_skipped'],
          name: 'idx_answers_skipped_by_question',
        },
      ],
    },
  );

  /**
   * Define model associations
   * @param {Object} models - All models
   */
  Answer.associate = function (models) {
    // Association with Response (many-to-one)
    Answer.belongsTo(models.Response, {
      foreignKey: 'responseId',
      as: 'response',
    });

    // Association with Question (many-to-one)
    Answer.belongsTo(models.Question, {
      foreignKey: 'questionId',
      as: 'question',
    });
  };

  /**
   * Instance methods
   */

  /**
   * Get answer summary for API responses
   * @returns {Object} Answer summary object
   */
  Answer.prototype.toSummaryJSON = function () {
    return {
      id: this.id,
      responseId: this.responseId,
      questionId: this.questionId,
      answerValue: this.answerValue,
      answerData: this.answerData,
      ratingScore: this.ratingScore,
      selectedOptions: this.selectedOptions,
      fileAttachment: this.fileAttachment,
      answerTime: this.answerTime,
      isSkipped: this.isSkipped,
      skipReason: this.skipReason,
      validationStatus: this.validationStatus,
      createdAt: this.createdAt,
    };
  };

  /**
   * Validate answer based on question requirements
   * @param {Object} question - Question object
   * @returns {Object} Validation result
   */
  Answer.prototype.validateAgainstQuestion = function (question) {
    const errors = [];

    if (this.isSkipped) {
      if (question.isRequired) {
        errors.push('Required question cannot be skipped');
      }
      return { isValid: errors.length === 0, errors };
    }

    switch (question.questionType) {
      case 'text':
      case 'textarea':
        if (!this.answerValue || this.answerValue.trim() === '') {
          if (question.isRequired) {
            errors.push('Text answer is required');
          }
        } else if (question.maxLength && this.answerValue.length > question.maxLength) {
          errors.push(`Answer exceeds maximum length of ${question.maxLength} characters`);
        }
        break;

      case 'single_choice':
        if (!this.selectedOptions || this.selectedOptions.length === 0) {
          if (question.isRequired) {
            errors.push('Single choice selection is required');
          }
        } else if (this.selectedOptions.length > 1) {
          errors.push('Single choice question can only have one selection');
        }
        break;

      case 'multiple_choice':
        if (!this.selectedOptions || this.selectedOptions.length === 0) {
          if (question.isRequired) {
            errors.push('Multiple choice selection is required');
          }
        }
        break;

      case 'rating':
        if (this.ratingScore === null || this.ratingScore === undefined) {
          if (question.isRequired) {
            errors.push('Rating score is required');
          }
        } else {
          if (question.minValue && this.ratingScore < parseFloat(question.minValue)) {
            errors.push(`Rating must be at least ${question.minValue}`);
          }
          if (question.maxValue && this.ratingScore > parseFloat(question.maxValue)) {
            errors.push(`Rating must be at most ${question.maxValue}`);
          }
        }
        break;

      case 'number':
        if (!this.answerValue || this.answerValue.trim() === '') {
          if (question.isRequired) {
            errors.push('Number answer is required');
          }
        } else {
          const num = parseFloat(this.answerValue);
          if (isNaN(num)) {
            errors.push('Answer must be a valid number');
          } else {
            if (question.minValue && num < parseFloat(question.minValue)) {
              errors.push(`Number must be at least ${question.minValue}`);
            }
            if (question.maxValue && num > parseFloat(question.maxValue)) {
              errors.push(`Number must be at most ${question.maxValue}`);
            }
          }
        }
        break;

      case 'email':
        if (!this.answerValue || this.answerValue.trim() === '') {
          if (question.isRequired) {
            errors.push('Email address is required');
          }
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(this.answerValue.trim())) {
            errors.push('Invalid email address format');
          }
        }
        break;

      case 'yes_no':
        if (this.answerValue === null || this.answerValue === undefined) {
          if (question.isRequired) {
            errors.push('Yes/No selection is required');
          }
        } else if (!['yes', 'no'].includes(this.answerValue.toString().toLowerCase())) {
          errors.push('Answer must be either "yes" or "no"');
        }
        break;
    }

    this.validationStatus = errors.length === 0 ? 'valid' : 'invalid';
    this.validationErrors = errors;

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  /**
   * Class methods
   */

  /**
   * Find answers by response
   * @param {number} responseId - Response ID
   * @param {Object} options - Query options
   * @returns {Array} Answers for the response
   */
  Answer.findByResponse = function (responseId, options = {}) {
    const { includeQuestion = false } = options;

    const include = [];
    if (includeQuestion) {
      include.push({
        model: require('./Question')(sequelize),
        as: 'question',
        attributes: ['id', 'questionText', 'questionType', 'category', 'isRequired'],
      });
    }

    return this.findAll({
      where: { responseId },
      include,
      order: [['createdAt', 'ASC']],
    });
  };

  /**
   * Find answers by question
   * @param {number} questionId - Question ID
   * @param {Object} options - Query options
   * @returns {Array} Answers for the question
   */
  Answer.findByQuestion = function (questionId, options = {}) {
    const { includeSkipped = false, onlyValid = false, dateFrom = null, dateTo = null } = options;

    const whereClause = { questionId };

    if (!includeSkipped) {
      whereClause.isSkipped = false;
    }

    if (onlyValid) {
      whereClause.validationStatus = 'valid';
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt[sequelize.Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.createdAt[sequelize.Op.lte] = new Date(dateTo);
      }
    }

    return this.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
    });
  };

  /**
   * Get answer statistics for a question
   * @param {number} questionId - Question ID
   * @param {Object} options - Query options
   * @returns {Object} Answer statistics
   */
  Answer.getStatistics = async function (questionId, options = {}) {
    const { includeSkipped = false } = options;

    const whereClause = { questionId };
    if (!includeSkipped) {
      whereClause.is_skipped = false;
    }

    const { Op } = require('sequelize');

    const [totalAnswers, skippedAnswers, validAnswers, averageRatingResult] = await Promise.all([
      this.count({ where: { questionId } }),
      this.count({ where: { questionId, is_skipped: true } }),
      this.count({ where: { ...whereClause, validation_status: 'valid' } }),
      sequelize.query(
        'SELECT AVG(rating_score) as averageRating FROM Answers WHERE questionId = :questionId AND is_skipped = false AND validation_status = :validStatus AND rating_score IS NOT NULL',
        {
          replacements: { questionId, validStatus: 'valid' },
          type: sequelize.QueryTypes.SELECT,
        },
      ).then(result => result[0] || null).catch(() => null),
    ]);

    const averageRating = averageRatingResult ? parseFloat(averageRatingResult.averageRating) || 0 : 0;

    return {
      totalAnswers,
      skippedAnswers,
      validAnswers,
      invalidAnswers: totalAnswers - validAnswers,
      skipRate: totalAnswers > 0 ? Math.round((skippedAnswers / totalAnswers) * 100) : 0,
      validRate: totalAnswers > 0 ? Math.round((validAnswers / totalAnswers) * 100) : 0,
      averageRating: Math.round((averageRating || 0) * 100) / 100,
    };
  };

  /**
   * Get answer statistics for multiple questions at once
   * @param {Array<number>} questionIds - Array of Question IDs
   * @param {Object} options - Query options
   * @returns {Object} Answer statistics for all questions
   */
  Answer.getBatchStatistics = async function (questionIds, options = {}) {
    const { includeSkipped = false } = options; // eslint-disable-line no-unused-vars

    if (!questionIds || questionIds.length === 0) {
      return {};
    }

    const { Op } = require('sequelize');

    // Get total counts for all questions
    const totalCounts = await this.findAll({
      attributes: [
        'questionId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
      ],
      where: {
        questionId: { [Op.in]: questionIds },
      },
      group: ['questionId'],
      raw: true,
    });

    // Get skipped counts for all questions
    const skippedCounts = await this.findAll({
      attributes: [
        'questionId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'skipped'],
      ],
      where: {
        questionId: { [Op.in]: questionIds },
        isSkipped: true,
      },
      group: ['questionId'],
      raw: true,
    });

    // Get valid counts for all questions
    const validCounts = await this.findAll({
      attributes: [
        'questionId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'valid'],
      ],
      where: {
        questionId: { [Op.in]: questionIds },
        isSkipped: false,
        validationStatus: 'valid',
      },
      group: ['questionId'],
      raw: true,
    });

    // Get average ratings for all questions
    const averageRatings = await this.findAll({
      attributes: [
        'questionId',
        [sequelize.fn('AVG', sequelize.col('rating_score')), 'averageRating'],
      ],
      where: {
        questionId: { [Op.in]: questionIds },
        isSkipped: false,
        validationStatus: 'valid',
        ratingScore: { [Op.not]: null },
      },
      group: ['questionId'],
      raw: true,
    });

    // Combine all statistics
    const stats = {};
    questionIds.forEach(questionId => {
      const total = totalCounts.find(item => item.questionId === questionId)?.total || 0;
      const skipped = skippedCounts.find(item => item.questionId === questionId)?.skipped || 0;
      const valid = validCounts.find(item => item.questionId === questionId)?.valid || 0;
      const averageRating = averageRatings.find(item => item.questionId === questionId)?.averageRating || 0;

      stats[questionId] = {
        totalAnswers: total,
        skippedAnswers: skipped,
        validAnswers: valid,
        invalidAnswers: total - valid,
        skipRate: total > 0 ? Math.round((skipped / total) * 100) : 0,
        validRate: total > 0 ? Math.round((valid / total) * 100) : 0,
        averageRating: Math.round((parseFloat(averageRating) || 0) * 100) / 100,
      };
    });

    return stats;
  };

  return Answer;
};
