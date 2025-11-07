'use strict';

const { DataTypes } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

/**
 * Question model definition
 * @param {import('sequelize').Sequelize} sequelize - Sequelize instance
 * @returns {import('sequelize').Model} Question model
 */
module.exports = (sequelize) => {
  const Question = sequelize.define(
    'Question',
    {
      id: {
        type: getDataType('BIGINT'),
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the question',
      },
      questionnaireId: {
        type: getDataType('BIGINT'),
        allowNull: false,
        field: 'questionnaire_id',
        comment: 'Foreign key to questionnaires table',
      },
      questionText: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 2000],
        },
        field: 'question_text',
        comment: 'The actual question text',
      },
      questionType: {
        type: DataTypes.ENUM(
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
        ),
        allowNull: false,
        field: 'question_type',
        comment: 'Type of question input expected',
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
          len: [0, 100],
        },
        comment: 'Category this question belongs to',
      },
      isRequired: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_required',
        comment: 'Whether this question is mandatory',
      },
      orderIndex: {
        type: getDataType('INTEGER'),
        allowNull: false,
        field: 'order_index',
        comment: 'Order of this question in the questionnaire',
      },
      options: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Options for choice-based questions',
      },
      validationRules: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Validation rules for the question response',
      },
      placeholder: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          len: [0, 255],
        },
        comment: 'Placeholder text for input fields',
      },
      helpText: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'help_text',
        comment: 'Additional help text for the question',
      },
      maxLength: {
        type: getDataType('INTEGER'),
        allowNull: true,
        field: 'max_length',
        comment: 'Maximum length for text-based answers',
      },
      minValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'min_value',
        comment: 'Minimum value for numeric questions',
      },
      maxValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'max_value',
        comment: 'Maximum value for numeric questions',
      },
      settings: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional question-specific settings',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
        comment: 'Whether this question is currently active',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
        comment: 'Timestamp when the question was created',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
        comment: 'Timestamp when the question was last updated',
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
        comment: 'Timestamp for soft delete (null if not deleted)',
      },
    },
    {
      tableName: 'questions',
      timestamps: true,
      paranoid: true, // Enable soft deletes
      underscored: true, // Use snake_case for column names
      indexes: [
        {
          fields: ['questionnaire_id'],
          name: 'idx_questions_questionnaire_id',
        },
        {
          fields: ['question_type'],
          name: 'idx_questions_question_type',
        },
        {
          fields: ['category'],
          name: 'idx_questions_category',
        },
        {
          fields: ['is_required'],
          name: 'idx_questions_is_required',
        },
        {
          fields: ['order_index'],
          name: 'idx_questions_order_index',
        },
        {
          fields: ['is_active'],
          name: 'idx_questions_is_active',
        },
        {
          fields: ['created_at'],
          name: 'idx_questions_created_at',
        },
        {
          fields: ['deleted_at'],
          name: 'idx_questions_deleted_at',
        },
        {
          fields: ['questionnaire_id', 'order_index'],
          name: 'idx_questions_questionnaire_order',
        },
        {
          fields: ['questionnaire_id', 'is_active', 'deleted_at'],
          name: 'idx_questions_active_in_questionnaire',
        },
      ],
    },
  );

  /**
   * Define model associations
   * @param {Object} models - All models
   */
  Question.associate = function (models) {
    // Association with Questionnaire (many-to-one)
    Question.belongsTo(models.Questionnaire, {
      foreignKey: 'questionnaireId',
      as: 'questionnaire',
    });

    // Association with Answers (one-to-many)
    Question.hasMany(models.Answer, {
      foreignKey: 'questionId',
      as: 'answers',
    });
  };

  /**
    * Instance methods
    */

  /**
    * Convert question to JSON with proper options handling
    * @returns {Object} Question JSON object
    */
  Question.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    // Ensure options are included in JSON response for choice-based questions
    if (this.questionType === 'multiple_choice' && this.options) {
      values.options = this.options;
    }
    if (this.questionType === 'single_choice' && this.options) {
      values.options = this.options;
    }
    return values;
  };

  /**
    * Get question summary for API responses
    * @returns {Object} Question summary object
    */
  Question.prototype.toSummaryJSON = function () {
    return {
      id: this.id,
      questionnaireId: this.questionnaireId,
      questionText: this.questionText,
      questionType: this.questionType,
      category: this.category,
      isRequired: this.isRequired,
      orderIndex: this.orderIndex,
      options: this.options,
      placeholder: this.placeholder,
      helpText: this.helpText,
      maxLength: this.maxLength,
      minValue: this.minValue,
      maxValue: this.maxValue,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  };

  /**
   * Validate question configuration based on type
   * @returns {Object} Validation result
   */
  Question.prototype.validateConfiguration = function () {
    const errors = [];

    // Convert options to array if it's an object with numeric keys
    let options = this.options;
    if (options && typeof options === 'object' && !Array.isArray(options)) {
      const keys = Object.keys(options).map(k => parseInt(k)).filter(k => !isNaN(k));
      if (keys.length > 0) {
        keys.sort((a, b) => a - b);
        options = keys.map(k => options[k.toString()]);
        this.options = options; // Update the instance
      }
    }

    switch (this.questionType) {
      case 'single_choice':
      case 'multiple_choice':
        if (!options || !Array.isArray(options) || options.length === 0) {
          errors.push('Choice-based questions must have at least one option');
        }
        break;

      case 'rating':
        if (this.minValue && this.maxValue) {
          if (parseFloat(this.minValue) >= parseFloat(this.maxValue)) {
            errors.push('For rating questions, min value must be less than max value');
          }
        }
        break;

      case 'text':
      case 'textarea':
        if (this.maxLength && this.maxLength <= 0) {
          errors.push('Max length must be greater than 0 for text questions');
        }
        break;

      case 'number':
        if (this.minValue && this.maxValue) {
          if (parseFloat(this.minValue) >= parseFloat(this.maxValue)) {
            errors.push('For number questions, min value must be less than max value');
          }
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  /**
   * Class methods
   */

  /**
   * Find questions by questionnaire with ordering
   * @param {number} questionnaireId - Questionnaire ID
   * @param {Object} options - Query options
   * @returns {Array} Ordered questions
   */
  Question.findByQuestionnaireOrdered = function (questionnaireId, options = {}) {
    const { includeInactive = false, category, type } = options;

    const whereClause = { questionnaireId };
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    if (category) {
      whereClause.category = category;
    }

    if (type) {
      whereClause.questionType = type;
    }

    return this.findAll({
      where: whereClause,
      order: [
        ['orderIndex', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });
  };

  /**
   * Get next order index for a questionnaire
   * @param {number} questionnaireId - Questionnaire ID
   * @returns {number} Next order index
   */
  Question.getNextOrderIndex = async function (questionnaireId) {
    const maxOrder = await this.max('orderIndex', {
      where: { questionnaireId },
    });

    return (maxOrder || 0) + 1;
  };

  /**
   * Reorder questions in a questionnaire
   * @param {number} questionnaireId - Questionnaire ID
   * @param {Array} questionOrders - Array of {id, orderIndex} objects
   * @returns {Array} Updated questions
   */
  Question.reorderQuestions = async function (questionnaireId, questionOrders) {
    const transaction = await sequelize.transaction();

    try {
      const updatedQuestions = [];

      // Handle both array and object with numeric keys
      if (!Array.isArray(questionOrders)) {
        if (questionOrders && typeof questionOrders === 'object') {
          // Convert object with numeric keys to array
          const keys = Object.keys(questionOrders).map(k => parseInt(k)).filter(k => !isNaN(k));
          if (keys.length > 0) {
            keys.sort((a, b) => a - b);
            questionOrders = keys.map(k => questionOrders[k.toString()]);
          } else {
            throw new Error('questionOrders must be an array or object with numeric keys');
          }
        } else {
          throw new Error('questionOrders must be an array');
        }
      }

      // eslint-disable-next-line no-await-in-loop
      for (const item of questionOrders) {
        const id = item.question_id || item.id;
        const orderIndex = item.order_index || item.orderIndex;

        const question = await this.findByPk(id, { transaction });
        if (question && question.questionnaireId === questionnaireId) {
          // Ensure orderIndex is properly updated
          // eslint-disable-next-line no-await-in-loop
          await this.update(
            { orderIndex },
            {
              where: {
                id,
                questionnaire_id: questionnaireId,
              },
              transaction,
            },
          );
          question.orderIndex = orderIndex; // Update instance for response
          updatedQuestions.push(question.toSummaryJSON());
        }
      }

      await transaction.commit();
      return updatedQuestions;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  return Question;
};
