'use strict';

const { DataTypes, Op } = require('sequelize');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const speakeasy = require('speakeasy');
const { getDataType } = require('../utils/dataTypeHelpers');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: getDataType('BIGINT'),
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the user',
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
          notEmpty: true,
        },
        comment: 'User email address for login and communication',
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: true, // Allow null initially, will be set by beforeCreate hook
        comment: 'Hashed password using bcrypt',
      },
      password: {
        type: DataTypes.VIRTUAL,
        comment: 'Plain text password (virtual field for hashing)',
      },
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
          len: [0, 100],
        },
        comment: 'User first name',
      },
      last_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
          len: [0, 100],
        },
        comment: 'User last name',
      },
      subscription_plan: {
        type: DataTypes.ENUM('free', 'starter', 'business', 'admin'),
        allowNull: false,
        defaultValue: 'free',
        comment: 'Current subscription plan of user',
      },
      subscription_status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended', 'cancelled'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Status of the subscription',
      },
      subscription_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Expiration date of current subscription',
      },
      email_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the user email has been verified',
      },
      email_verification_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Token for email verification',
      },
      email_verification_expires: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Expiration time for email verification token',
      },
      password_reset_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Token for password reset',
      },
      password_reset_expires: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Expiration time for password reset token',
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of last login',
      },
      login_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of failed login attempts',
      },
      locked_until: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp until which account is locked',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the user account is active',
      },
      preferences: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'User preferences and settings',
      },
      role: {
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user',
        comment: 'User role for access control',
      },
      mfa_secret: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'TOTP secret for multi-factor authentication',
      },
      mfa_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether MFA is enabled for this user',
      },
      failed_login_ips: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of IPs with failed login attempts for security monitoring',
      },
    },
    {
      tableName: 'users',
      // Only use MySQL-specific options in non-test environments
      ...(process.env.NODE_ENV !== 'test' && {
        engine: 'InnoDB',
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }),
      comment: 'User accounts with subscription management',
      // Only add indexes in non-test environments to avoid SQLite compatibility issues
      ...(process.env.NODE_ENV !== 'test' && {
        indexes: [
          {
            name: 'idx_users_email',
            unique: true,
            fields: ['email'],
          },
          {
            name: 'idx_users_subscription_plan',
            fields: ['subscription_plan'],
          },
          {
            name: 'idx_users_subscription_status',
            fields: ['subscription_status'],
          },
          {
            name: 'idx_users_email_verified',
            fields: ['email_verified'],
          },
          {
            name: 'idx_users_is_active',
            fields: ['is_active'],
          },
          {
            name: 'idx_users_created_at',
            fields: ['created_at'],
          },
          {
            name: 'idx_users_deleted_at',
            fields: ['deleted_at'],
          },
        ],
      }),
      paranoid: true, // Enable soft deletes with deleted_at
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  );

  // Instance methods
  User.prototype.validatePassword = function (password) {
    if (!this.password_hash) {
      return false;
    }
    return bcrypt.compare(password, this.password_hash);
  };

  User.prototype.generateEmailVerificationToken = function () {
    const token = uuidv4();
    this.email_verification_token = token;
    this.email_verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return token;
  };

  User.prototype.generatePasswordResetToken = function () {
    const token = uuidv4();
    this.password_reset_token = token;
    this.password_reset_expires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    return token;
  };

  User.prototype.isLocked = function () {
    return !!(this.locked_until && this.locked_until > Date.now());
  };

  User.prototype.incrementLoginAttempts = function (ip = null) {
    // If we have a previous lock that has expired, restart at 1
    if (this.locked_until && this.locked_until < Date.now()) {
      return this.update({
        login_attempts: 1,
        locked_until: null,
      });
    }

    const updates = { login_attempts: this.login_attempts + 1 };

    // Lock account after 5 failed attempts for 2 hours
    if (this.login_attempts + 1 >= 5 && !this.isLocked()) {
      updates.locked_until = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    }

    // Track failed login IPs if provided
    if (ip) {
      this.addFailedLoginIP(ip);
    }

    return this.update(updates);
  };

  User.prototype.resetLoginAttempts = function () {
    return this.update({
      login_attempts: 0,
      locked_until: null,
      last_login_at: new Date(),
    });
  };

  User.prototype.generateMFASecret = function () {
    const secret = speakeasy.generateSecret({
      name: `Ulasis (${this.email})`,
      issuer: 'Ulasis Platform',
    });
    this.mfa_secret = secret.base32;
    return secret;
  };

  User.prototype.verifyMFAToken = function (token) {
    if (!this.mfa_secret) {
      return false;
    }
    return speakeasy.totp.verify({
      secret: this.mfa_secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps (30 seconds) tolerance
    });
  };

  User.prototype.enableMFA = function () {
    this.mfa_enabled = true;
    return this.save();
  };

  User.prototype.disableMFA = function () {
    this.mfa_enabled = false;
    this.mfa_secret = null;
    return this.save();
  };

  User.prototype.addFailedLoginIP = function (ip) {
    const ips = this.failed_login_ips || [];
    const now = Date.now();
    // Keep only recent attempts (last 24 hours)
    const recentIPs = ips.filter(entry => now - entry.timestamp < 24 * 60 * 60 * 1000);
    recentIPs.push({ ip, timestamp: now });
    this.failed_login_ips = recentIPs;
    return this.save();
  };

  User.prototype.getFailedLoginCount = function (ip, timeWindowMs = 15 * 60 * 1000) {
    const ips = this.failed_login_ips || [];
    const now = Date.now();
    return ips.filter(entry => entry.ip === ip && now - entry.timestamp < timeWindowMs).length;
  };

  // Class methods
  User.hashPassword = function (password) {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  };

  // Static method to create user with proper password hashing
  User.createWithPassword = async function(userData) {
    if (userData.password) {
      userData.password_hash = await User.hashPassword(userData.password);
      delete userData.password;
    }
    return this.create(userData);
  };

  User.findByEmail = function (email) {
    return this.findOne({
      where: { email: email.toLowerCase() },
    });
  };

  User.findByVerificationToken = function (token) {
    return this.findOne({
      where: {
        email_verification_token: token,
        email_verification_expires: {
          [Op.gt]: new Date(),
        },
      },
    });
  };

  User.findByPasswordResetToken = function (token) {
    return this.findOne({
      where: {
        password_reset_token: token,
        password_reset_expires: {
          [Op.gt]: new Date(),
        },
      },
    });
  };

  // Hooks
  User.beforeCreate(async (user) => {
    // Handle password hashing - support both password and password_hash fields
    if (user.password) {
      // Hash plain text password
      user.password_hash = await User.hashPassword(user.password);
      // Clear plain text password
      user.password = undefined;
    } else if (user.password_hash && !user.password_hash.startsWith('$2b$')) {
      // Hash password_hash if it's not already hashed
      user.password_hash = await User.hashPassword(user.password_hash);
    }

    if (user.email) {
      user.email = user.email.toLowerCase();
    }
  });

  User.beforeUpdate(async (user) => {
    // Handle password hashing for updates
    if (user.changed('password')) {
      // Hash plain text password
      user.password_hash = await User.hashPassword(user.password);
      // Clear plain text password
      user.password = undefined;
    } else if (user.changed('password_hash') && !user.password_hash.startsWith('$2b$')) {
      // Hash password_hash if it's not already hashed
      user.password_hash = await User.hashPassword(user.password_hash);
    }

    if (user.changed('email')) {
      user.email = user.email.toLowerCase();
    }
  });

  // Scopes
  User.addScope('active', {
    where: {
      is_active: true,
    },
  });

  User.addScope('verified', {
    where: {
      email_verified: true,
    },
  });

  User.addScope('withSubscription', {
    where: {
      subscription_status: 'active',
    },
  });

  // Associations
  User.associate = function(models) {
    // Association to AdminUser
    User.hasOne(models.AdminUser, {
      foreignKey: 'user_id',
      as: 'adminUser',
    });
  };

  return User;
};
