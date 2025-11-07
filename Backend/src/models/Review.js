'use strict';

const { DataTypes } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

module.exports = (sequelize) => {
  const Review = sequelize.define(
    'Review',
    {
      id: {
        type: getDataType('BIGINT'),
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the review',
      },
      user_id: {
        type: getDataType('BIGINT'),
        allowNull: false,
        comment: 'Foreign key to users table (admin who processed the review)',
      },
      response_id: {
        type: getDataType('BIGINT'),
        allowNull: false,
        comment: 'Foreign key to responses table',
      },
      review_status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'flagged', 'needs_review'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current status of the review',
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'Priority level of the review',
      },
      admin_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notes added by the admin during review',
      },
      internal_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Internal comments not visible to respondents',
      },
      flagged_reasons: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Reasons why the response was flagged',
      },
      moderation_actions: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Actions taken during moderation',
      },
      auto_flagged: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this was automatically flagged by the system',
      },
      flag_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Confidence score for automatic flagging',
      },
      reviewed_by: {
        type: getDataType('BIGINT'),
        allowNull: true,
        comment: 'ID of the admin who performed the review',
      },
      assigned_to: {
        type: getDataType('BIGINT'),
        allowNull: true,
        comment: 'ID of the admin assigned to this review',
      },
      processed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when the review was processed',
      },
      next_review_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp for scheduled next review',
      },
      escalation_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Escalation level for the review',
      },
      review_duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Time taken to complete the review in seconds',
      },
      quality_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Quality score assigned during review',
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Tags for categorizing reviews',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional review metadata',
      },
    },
    {
      tableName: 'reviews',
      // Only use MySQL-specific options in non-test environments
      ...(process.env.NODE_ENV !== 'test' && {
        engine: 'InnoDB',
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }),
      comment: 'Manual review processing',
      paranoid: true, // Enable soft deletes with deleted_at
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  );

  // Associations
  Review.associate = (models) => {
    Review.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
    Review.belongsTo(models.User, {
      foreignKey: 'reviewed_by',
      as: 'reviewer',
    });
    Review.belongsTo(models.User, {
      foreignKey: 'assigned_to',
      as: 'assignedAdmin',
    });
    Review.belongsTo(models.Response, {
      foreignKey: 'response_id',
      as: 'response',
    });
  };

  return Review;
};