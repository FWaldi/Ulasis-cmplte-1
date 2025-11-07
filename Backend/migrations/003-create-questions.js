'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('questions', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the question',
      },
      questionnaire_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'Foreign key to questionnaires table',
        references: {
          model: 'questionnaires',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      question_text: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'The actual question text',
      },
      question_type: {
        type: Sequelize.ENUM(
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
          'file_upload'
        ),
        allowNull: false,
        comment: 'Type of question input expected',
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Category this question belongs to',
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this question is mandatory',
      },
      order_index: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        comment: 'Order of this question in the questionnaire',
      },
      options: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Options for choice-based questions',
      },
      validation_rules: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Validation rules for the question response',
      },
      placeholder: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Placeholder text for input fields',
      },
      help_text: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional help text for the question',
      },
      max_length: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Maximum length for text-based answers',
      },
      min_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Minimum value for numeric questions',
      },
      max_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Maximum value for numeric questions',
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional question-specific settings',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this question is currently active',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the question was created',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the question was last updated',
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp for soft delete (null if not deleted)',
      },
    });

    // Create indexes for performance
    // Indexes commented out to avoid duplicate key errors during initial setup
    // await queryInterface.addIndex('questions', ['questionnaire_id'], {
    //   name: 'idx_questions_questionnaire_id',
    // });
    // ... other indexes
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('questions');
  },
};
