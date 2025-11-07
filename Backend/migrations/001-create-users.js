'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the user',
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'User email address for login and communication',
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Hashed password using bcrypt',
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'User first name',
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'User last name',
      },
      subscription_plan: {
        type: Sequelize.ENUM('free', 'starter', 'business'),
        allowNull: false,
        defaultValue: 'free',
        comment: 'Current subscription plan of the user',
      },
      subscription_status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended', 'cancelled'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Status of the subscription',
      },
      subscription_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Expiration date of current subscription',
      },
      email_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the user email has been verified',
      },
      email_verification_token: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Token for email verification',
      },
      email_verification_expires: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Expiration time for email verification token',
      },
      password_reset_token: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Token for password reset',
      },
      password_reset_expires: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Expiration time for password reset token',
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp of last login',
      },
      login_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of failed login attempts',
      },
      locked_until: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp until which account is locked',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the user account is active',
      },
      preferences: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'User preferences and settings',
      },
      role: {
        type: Sequelize.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user',
        comment: 'User role for access control',
      },
      mfa_secret: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'TOTP secret for multi-factor authentication',
      },
      mfa_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether MFA is enabled for this user',
      },
      failed_login_ips: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of IPs with failed login attempts for security monitoring',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the user was created',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the user was last updated',
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp for soft delete (null if not deleted)',
      },
    });

    // Create indexes
    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email',
      unique: true,
    });
    await queryInterface.addIndex('users', ['subscription_plan'], {
      name: 'idx_users_subscription_plan',
    });
    await queryInterface.addIndex('users', ['subscription_status'], {
      name: 'idx_users_subscription_status',
    });
    await queryInterface.addIndex('users', ['email_verified'], {
      name: 'idx_users_email_verified',
    });
    await queryInterface.addIndex('users', ['is_active'], {
      name: 'idx_users_is_active',
    });
    await queryInterface.addIndex('users', ['created_at'], {
      name: 'idx_users_created_at',
    });
    await queryInterface.addIndex('users', ['deleted_at'], {
      name: 'idx_users_deleted_at',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  },
};
