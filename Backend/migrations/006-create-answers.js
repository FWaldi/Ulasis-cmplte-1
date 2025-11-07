'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('answers', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the answer',
      },
      response_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        comment: 'Foreign key to responses table',
        references: {
          model: 'responses',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      question_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'Foreign key to questions table',
        references: {
          model: 'questions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      answer_value: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'The actual answer value provided by the respondent',
      },
      answer_data: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Structured answer data for complex question types',
      },
      rating_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Numeric rating score if applicable',
      },
      selected_options: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of selected options for multiple choice questions',
      },
      file_attachment: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Path to uploaded file attachment',
      },
      file_metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Metadata for uploaded files',
      },
      answer_time: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Time taken to answer this question in seconds',
      },
      is_skipped: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the question was skipped',
      },
      skip_reason: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Reason for skipping the question',
      },
      validation_status: {
        type: Sequelize.ENUM('valid', 'invalid', 'pending'),
        allowNull: false,
        defaultValue: 'valid',
        comment: 'Validation status of the answer',
      },
      validation_errors: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'List of validation errors if any',
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional answer metadata',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the answer was created',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the answer was last updated',
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp for soft delete (null if not deleted)',
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'Individual question responses',
    });


  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('answers');
  },
};
