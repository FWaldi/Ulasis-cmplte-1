'use strict';

const { DataTypes } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

module.exports = (sequelize) => {
  const NotificationPreference = sequelize.define(
    'NotificationPreference',
    {
      id: {
        type: getDataType('BIGINT'),
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique preference record identifier',
      },
      user_id: {
        type: getDataType('BIGINT'),
        allowNull: false,
        comment: 'User ID for preferences',
        references: {
          model: 'users',
          key: 'id',
        },
      },
      email_notifications: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Master switch for email notifications',
      },
      new_review_alerts: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Notifications for new reviews',
      },
      subscription_updates: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Notifications for subscription changes',
      },
      account_security: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Security-related notifications',
      },
    },
    {
      tableName: 'notification_preferences',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      comment: 'User notification preferences for email settings',
      indexes: [
        {
          unique: true,
          fields: ['user_id'],
          name: 'idx_notification_preferences_user_id',
        },
      ],
    },
  );

  // Define associations
  NotificationPreference.associate = (models) => {
    NotificationPreference.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
    });
  };

  return NotificationPreference;
};