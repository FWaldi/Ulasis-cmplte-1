'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique audit entry identifier',
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who performed action (nullable for system actions)',
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Action performed (CREATE, UPDATE, DELETE, LOGIN, etc.)',
      },
      resource_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Type of resource affected (user, questionnaire, response, etc.)',
      },
      resource_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        comment: 'ID of affected resource',
      },
      details: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional action details and metadata',
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'Client IP address',
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser/client user agent',
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Action timestamp',
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
      comment: 'Audit log for tracking user and system actions',
    });

    // Create indexes
    await queryInterface.addIndex('audit_logs', ['user_id'], {
      name: 'idx_audit_logs_user_id',
    });
    await queryInterface.addIndex('audit_logs', ['action'], {
      name: 'idx_audit_logs_action',
    });
    await queryInterface.addIndex('audit_logs', ['resource_type'], {
      name: 'idx_audit_logs_resource_type',
    });
    await queryInterface.addIndex('audit_logs', ['timestamp'], {
      name: 'idx_audit_logs_timestamp',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('audit_logs');
  },
};