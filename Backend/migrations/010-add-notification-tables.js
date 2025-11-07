'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create notification_preferences table
    await queryInterface.createTable('notification_preferences', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique preference record identifier',
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'User ID for preferences',
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      email_notifications: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Master switch for email notifications',
      },
      new_review_alerts: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Notifications for new reviews',
      },
      subscription_updates: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Notifications for subscription changes',
      },
      account_security: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Security-related notifications',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Record creation timestamp',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Last update timestamp',
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'User notification preferences for email settings',
    });

    // Create notification_history table
    await queryInterface.createTable('notification_history', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique notification identifier',
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'Recipient user ID',
        references: {
          model: 'users',
          key: 'id',
        },
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
        comment: 'Record creation timestamp',
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'Email notification history and tracking',
    });

    // Create indexes for notification_preferences
    // await queryInterface.addIndex('notification_preferences', ['user_id'], {
      // name: 'idx_notification_preferences_user_id',
      // unique: true,
    // });

    // Create indexes for notification_history
    // await queryInterface.addIndex('notification_history', ['user_id'], {
      // name: 'idx_notification_history_user_id',
    // });

    // await queryInterface.addIndex('notification_history', ['notification_type'], {
      // name: 'idx_notification_history_type',
    // });

    // await queryInterface.addIndex('notification_history', ['email_status'], {
      // name: 'idx_notification_history_status',
    // });

    // await queryInterface.addIndex('notification_history', ['sent_at'], {
      // name: 'idx_notification_history_sent_at',
    // });

    // await queryInterface.addIndex('notification_history', ['created_at'], {
      // name: 'idx_notification_history_created_at',
    // });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notification_history');
    await queryInterface.dropTable('notification_preferences');
  },
};
