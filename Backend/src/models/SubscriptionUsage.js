'use strict';

const { DataTypes } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

module.exports = (sequelize) => {
  const SubscriptionUsage = sequelize.define(
    'SubscriptionUsage',
    {
      id: {
        type: getDataType('BIGINT'),
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the usage record',
      },
      user_id: {
        type: getDataType('BIGINT'),
        allowNull: false,
        comment: 'User ID for usage tracking',
        references: {
          model: 'users',
          key: 'id',
        },
      },
      usage_type: {
        type: DataTypes.ENUM('questionnaires', 'responses', 'exports'),
        allowNull: false,
        comment: 'Type of usage being tracked',
      },
      current_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Current usage count',
      },
      limit_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Plan limit count (null for unlimited)',
      },
      reset_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Usage reset date (monthly/yearly)',
      },
    },
    {
      tableName: 'subscription_usage',
      // Only use MySQL-specific options in non-test environments
      ...(process.env.NODE_ENV !== 'test' && {
        engine: 'InnoDB',
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }),
      comment: 'Subscription usage tracking for plan limitations',
      // Only add indexes in non-test environments to avoid SQLite compatibility issues
      ...(process.env.NODE_ENV !== 'test' && {
        indexes: [
          {
            name: 'idx_subscription_usage_user_id',
            fields: ['user_id'],
          },
          {
            name: 'idx_subscription_usage_type',
            fields: ['usage_type'],
          },
          {
            name: 'idx_subscription_usage_user_type',
            unique: true,
            fields: ['user_id', 'usage_type'],
          },
          {
            name: 'idx_subscription_usage_reset_date',
            fields: ['reset_date'],
          },
        ],
      }),
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  // Associations
  SubscriptionUsage.associate = (models) => {
    SubscriptionUsage.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
  };

  return SubscriptionUsage;
};