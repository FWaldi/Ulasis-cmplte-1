'use strict';

const { DataTypes } = require('sequelize');
const { getDataType } = require('../utils/dataTypeHelpers');

module.exports = (sequelize) => {
  const NotificationHistory = sequelize.define(
    'NotificationHistory',
    {
      id: {
        type: getDataType('BIGINT'),
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique notification identifier',
      },
      user_id: {
        type: getDataType('BIGINT'),
        allowNull: false,
        comment: 'Recipient user ID',
        references: {
          model: 'users',
          key: 'id',
        },
      },
      notification_type: {
        type: DataTypes.ENUM('verification', 'review', 'subscription', 'security', 'test'),
        allowNull: false,
        comment: 'Type of notification',
      },
      email_subject: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Email subject line',
      },
      email_status: {
        type: DataTypes.ENUM('queued', 'sent', 'delivered', 'bounced', 'failed'),
        allowNull: false,
        defaultValue: 'queued',
        comment: 'Delivery status',
      },
      sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Email send timestamp',
      },
      delivered_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Delivery confirmation timestamp',
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error details if failed',
      },
    },
    {
      tableName: 'notification_history',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false, // No updated_at for history records
      comment: 'Email notification history and tracking',
      indexes: [
        {
          fields: ['user_id'],
          name: 'idx_notification_history_user_id',
        },
        {
          fields: ['notification_type'],
          name: 'idx_notification_history_type',
        },
        {
          fields: ['email_status'],
          name: 'idx_notification_history_status',
        },
        {
          fields: ['sent_at'],
          name: 'idx_notification_history_sent_at',
        },
        {
          fields: ['created_at'],
          name: 'idx_notification_history_created_at',
        },
      ],
    },
  );

  // Define associations
  NotificationHistory.associate = (models) => {
    NotificationHistory.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
    });
  };

  return NotificationHistory;
};