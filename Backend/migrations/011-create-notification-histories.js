'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notification_history', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique notification identifier',
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        comment: 'Recipient user ID',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      notification_type: {
        type: Sequelize.ENUM('verification', 'review', 'subscription', 'security', 'test'),
        allowNull: false,
        comment: 'Type of notification',
      },
      email_subject: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Email subject line',
      },
      email_status: {
        type: Sequelize.ENUM('queued', 'sent', 'delivered', 'bounced', 'failed'),
        allowNull: false,
        defaultValue: 'queued',
        comment: 'Delivery status',
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Email send timestamp',
      },
      delivered_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Delivery confirmation timestamp',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error details if failed',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the record was created',
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
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
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notification_history');
  },
};