'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create admin_roles table
    await queryInterface.createTable('admin_roles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.ENUM('super_admin', 'admin', 'manager', 'support', 'analyst'),
        allowNull: false,
        unique: true,
      },
      display_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      permissions: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create admin_users table
    await queryInterface.createTable('admin_users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'admin_roles',
          key: 'id',
        },
        onDelete: 'RESTRICT',
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      permissions: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      login_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      two_factor_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      api_access_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      api_key: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create admin_activities table
    await queryInterface.createTable('admin_activities', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      admin_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'admin_users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      resource_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      resource_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      details: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      session_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('success', 'failure', 'warning'),
        allowNull: false,
        defaultValue: 'success',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create enterprise_reports table
    await queryInterface.createTable('enterprise_reports', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM(
          'user_analytics',
          'subscription_revenue',
          'usage_statistics',
          'security_audit',
          'performance_metrics',
          'content_moderation',
          'custom'
        ),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      parameters: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      schedule: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      format: {
        type: Sequelize.ENUM('json', 'csv', 'excel', 'pdf'),
        allowNull: false,
        defaultValue: 'json',
      },
      status: {
        type: Sequelize.ENUM('draft', 'scheduled', 'running', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'draft',
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      file_size: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      generated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'admin_users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Insert default admin roles
    await queryInterface.bulkInsert('admin_roles', [
      {
        name: 'super_admin',
        display_name: 'Super Administrator',
        description: 'Full system access with all permissions',
        permissions: ['*'],
        level: 100,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'admin',
        display_name: 'Administrator',
        description: 'Administrative access with most permissions',
        permissions: [
          'user_management', 'subscription_management', 'content_moderation',
          'analytics_view', 'reports_generate', 'system_monitoring'
        ],
        level: 80,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'manager',
        display_name: 'Manager',
        description: 'Management access with limited permissions',
        permissions: [
          'user_view', 'user_update', 'subscription_view', 'analytics_view'
        ],
        level: 60,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'support',
        display_name: 'Support Agent',
        description: 'Customer support access',
        permissions: [
          'user_view', 'user_update_basic', 'subscription_view', 'content_moderation'
        ],
        level: 40,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'analyst',
        display_name: 'Business Analyst',
        description: 'Analytics and reporting access',
        permissions: [
          'analytics_view', 'reports_generate', 'user_view', 'subscription_view'
        ],
        level: 30,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Create indexes for better performance
    await queryInterface.addIndex('admin_roles', ['name'], { unique: true });
    await queryInterface.addIndex('admin_roles', ['level']);
    await queryInterface.addIndex('admin_roles', ['is_active']);
    
    await queryInterface.addIndex('admin_users', ['user_id'], { unique: true });
    await queryInterface.addIndex('admin_users', ['role_id']);
    await queryInterface.addIndex('admin_users', ['is_active']);
    await queryInterface.addIndex('admin_users', ['api_key'], { unique: true });
    
    await queryInterface.addIndex('admin_activities', ['admin_user_id']);
    await queryInterface.addIndex('admin_activities', ['action']);
    await queryInterface.addIndex('admin_activities', ['resource_type']);
    await queryInterface.addIndex('admin_activities', ['created_at']);
    await queryInterface.addIndex('admin_activities', ['status']);
    await queryInterface.addIndex('admin_activities', ['admin_user_id', 'created_at']);
    
    await queryInterface.addIndex('enterprise_reports', ['type']);
    await queryInterface.addIndex('enterprise_reports', ['status']);
    await queryInterface.addIndex('enterprise_reports', ['created_by']);
    await queryInterface.addIndex('enterprise_reports', ['created_at']);
    await queryInterface.addIndex('enterprise_reports', ['expires_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('enterprise_reports');
    await queryInterface.dropTable('admin_activities');
    await queryInterface.dropTable('admin_users');
    await queryInterface.dropTable('admin_roles');
  },
};