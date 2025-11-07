'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('reviews', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the review',
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        comment: 'Foreign key to users table (admin who processed the review)',
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
      review_status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'flagged', 'needs_review'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current status of the review',
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'Priority level of the review',
      },
      admin_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes added by the admin during review',
      },
      internal_comments: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Internal comments not visible to respondents',
      },
      flagged_reasons: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Reasons why the response was flagged',
      },
      moderation_actions: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Actions taken during moderation',
      },
      auto_flagged: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this was automatically flagged by the system',
      },
      flag_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Confidence score for automatic flagging',
      },
      reviewed_by: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        comment: 'ID of the admin who performed the review',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      assigned_to: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        comment: 'ID of the admin assigned to this review',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when the review was processed',
      },
      next_review_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp for scheduled next review',
      },
      escalation_level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Escalation level for the review',
      },
      review_duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Time taken to complete the review in seconds',
      },
      quality_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Quality score assigned during review',
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Tags for categorizing reviews',
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional review metadata',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the record was created',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the record was last updated',
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp for soft delete',
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'Manual review processing',
      paranoid: true,
      deletedAt: 'deleted_at',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('reviews');
  },
};