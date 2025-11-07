'use strict';

const { User } = require('../models');
const tokenUtils = require('../utils/tokenUtils');
const emailService = require('./emailService');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');
// const { Op } = require('sequelize'); // eslint-disable-line no-unused-vars

/**
 * Authentication service containing business logic for user authentication
 */
class AuthService {
  /**
   * Register a new user
   * @param {Object} registrationData - User registration data
   * @returns {Object} Registration result
   */
  async register(registrationData) {
    const { email, password, first_name, last_name, role } = registrationData;

    try {
      // Check if user already exists
      const existingUser = await User.unscoped().findByEmail(email);
      if (existingUser) {
        throw new Error('A user with this email address already exists');
      }

      // Hash the password
      const saltRounds = 8;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Create new user
      const user = await User.create({
        email: email.toLowerCase().trim(),
        password_hash,
        first_name: first_name?.trim(),
        last_name: last_name?.trim(),
        role: role || 'user',
        subscription_plan: registrationData.subscription_plan || 'free',
        subscription_status: registrationData.subscription_status || 'active',
        email_verified: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test', // Auto-verify in development and test
      });

      // Generate email verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // Send verification email
      try {
        await emailService.sendVerificationEmail(user, verificationToken);
      } catch (emailError) {
        logger.error('Failed to send verification email during registration', {
          userId: user.id,
          email: user.email,
          error: emailError.message,
        });
        // Don't fail registration if email fails, but log it
      }

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        subscriptionPlan: user.subscription_plan,
      });

      return {
        success: true,
        message: 'Registration successful. Please check your email for verification.',
        data: {
          user_id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          subscription_plan: user.subscription_plan,
          email_verified: user.email_verified,
        },
      };
    } catch (error) {
      logger.error('User registration failed', {
        email: registrationData.email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Authenticate user and generate tokens
   * @param {Object} loginData - Login credentials
   * @param {Object} options - Additional options
   * @returns {Object} Login result with tokens
   */
  async login(loginData, options = {}) {
    const { email, password, mfa_token } = loginData;
    const { requireMFA = false, ip } = options;

    try {
      // Find user by email
      let user;
      if (process.env.NODE_ENV === 'test') {
        user = await User.findOne({ where: { email: email.toLowerCase() } });
      } else {
        user = await User.unscoped().findByEmail(email.toLowerCase());
      }

      if (!user || !user.is_active) {
        const error = new Error('Invalid email or password');
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }

      // Check if account is locked
      if (user.isLocked()) {
        throw new Error(
          'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
        );
      }

      // Validate password
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        await user.incrementLoginAttempts(ip);
        const error = new Error('Invalid email or password');
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }

      // Check MFA if required or enabled
      if (user.mfa_enabled || requireMFA) {
        if (!mfa_token) {
          throw new Error('Multi-factor authentication token required');
        }
        const isValidMFA = user.verifyMFAToken(mfa_token);
        if (!isValidMFA) {
          await user.incrementLoginAttempts(ip);
          throw new Error('Invalid multi-factor authentication token');
        }
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();

      // Generate tokens
      logger.info('DEBUG: About to generate tokens for user', { userId: user.id, email: user.email });
      const tokens = tokenUtils.generateTokenPair(user);

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
      });

      return {
        success: true,
        message: 'Login successful',
        data: {
          ...tokens,
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            subscription_plan: user.subscription_plan,
            subscription_status: user.subscription_status,
            email_verified: user.email_verified,
            last_login_at: user.last_login_at,
          },
        },
      };
    } catch (error) {
      logger.error('User login failed', {
        email: loginData.email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Verify email using token
   * @param {string} token - Email verification token
   * @returns {Object} Verification result
   */
  async verifyEmail(token) {
    try {
      const user = await User.findByVerificationToken(token);
      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      // Mark email as verified
      user.email_verified = true;
      user.email_verification_token = null;
      user.email_verification_expires = null;
      await user.save();

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user);
      } catch (emailError) {
        logger.error('Failed to send welcome email', {
          userId: user.id,
          email: user.email,
          error: emailError.message,
        });
        // Don't fail verification if welcome email fails
      }

      logger.info('Email verified successfully', {
        userId: user.id,
        email: user.email,
      });

      return {
        success: true,
        message: 'Email verified successfully. You can now login to your account.',
        data: {
          user_id: user.id,
          email: user.email,
          email_verified: user.email_verified,
        },
      };
    } catch (error) {
      logger.error('Email verification failed', {
        token,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Object} Password reset request result
   */
  async requestPasswordReset(email) {
    try {
      const user = await User.unscoped().findByEmail(email.toLowerCase());
      if (!user || !user.is_active) {
        // Don't reveal if user exists for security
        return {
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.',
        };
      }

      // Generate password reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail(user, resetToken);
      } catch (emailError) {
        logger.error('Failed to send password reset email', {
          userId: user.id,
          email: user.email,
          error: emailError.message,
        });
        throw new Error('Failed to send password reset email. Please try again later.');
      }

      logger.info('Password reset requested', {
        userId: user.id,
        email: user.email,
      });

      return {
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.',
      };
    } catch (error) {
      logger.error('Password reset request failed', {
        email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Reset password using token
   * @param {string} token - Password reset token
   * @param {string} newPassword - New password
   * @returns {Object} Password reset result
   */
  async resetPassword(token, newPassword) {
    try {
      const user = await User.findByPasswordResetToken(token);
      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Update password and clear reset token
      user.password = newPassword; // Will be hashed by model hook
      user.password_reset_token = null;
      user.password_reset_expires = null;
      user.login_attempts = 0; // Reset login attempts
      user.locked_until = null; // Unlock account if locked
      await user.save();

      logger.info('Password reset successfully', {
        userId: user.id,
        email: user.email,
      });

      return {
        success: true,
        message: 'Password reset successfully. You can now login with your new password.',
        data: {
          user_id: user.id,
          email: user.email,
        },
      };
    } catch (error) {
      logger.error('Password reset failed', {
        token,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New token pair
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = await tokenUtils.verifyRefreshToken(refreshToken);

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Find user
      const user = await User.unscoped().findByPk(decoded.sub);
      if (!user || !user.is_active) {
        throw new Error('User not found');
      }

      // Blacklist the old refresh token
      await tokenUtils.blacklistToken(refreshToken, 'token_refresh', user.id);

      // Generate new token pair
      const tokens = tokenUtils.generateTokenPair(user);

      logger.info('Token refreshed successfully', {
        userId: user.id,
        email: user.email,
        oldTokenJti: decoded.jti,
      });

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: tokens,
      };
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get user profile
   * @param {number} userId - User ID
   * @returns {Object} User profile data
   */
  async getProfile(userId) {
    try {
      const user = await User.unscoped().findByPk(userId, {
        attributes: {
          exclude: ['password_hash', 'email_verification_token', 'password_reset_token'],
        },
      });

      if (!user || !user.is_active) {
        throw new Error('User not found');
      }

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          subscription_plan: user.subscription_plan,
          subscription_status: user.subscription_status,
          subscription_expires_at: user.subscription_expires_at,
          email_verified: user.email_verified,
          last_login_at: user.last_login_at,
          is_active: user.is_active,
          preferences: user.preferences,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      };
    } catch (error) {
      logger.error('Get profile failed', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {number} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated profile data
   */
  async updateProfile(userId, updateData) {
    try {
      const user = await User.unscoped().findByPk(userId);
      if (!user || !user.is_active) {
        throw new Error('User not found');
      }

      const { first_name, last_name, preferences } = updateData;

      // Update allowed fields
      if (first_name !== undefined) user.first_name = first_name?.trim();
      if (last_name !== undefined) user.last_name = last_name?.trim();
      if (preferences !== undefined) user.preferences = preferences;

      await user.save();

      logger.info('Profile updated successfully', {
        userId,
        updatedFields: Object.keys(updateData),
      });

      return {
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          preferences: user.preferences,
          updated_at: user.updated_at,
        },
      };
    } catch (error) {
      logger.error('Profile update failed', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Object} Password change result
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.unscoped().findByPk(userId);
      if (!user || !user.is_active) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await user.validatePassword(currentPassword);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword; // Will be hashed by model hook
      await user.save();

      // Blacklist all user tokens for security
      const blacklistedCount = await tokenUtils.blacklistAllUserTokens(userId, 'password_change');

      logger.info('Password changed successfully', {
        userId,
        email: user.email,
        blacklistedCount,
      });

      return {
        success: true,
        message: 'Password changed successfully. All sessions have been invalidated.',
      };
    } catch (error) {
      logger.error('Password change failed', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Setup MFA for user
   * @param {number} userId - User ID
   * @returns {Object} MFA setup result
   */
  async setupMFA(userId) {
    try {
      const user = await User.unscoped().findByPk(userId);
      if (!user || !user.is_active) {
        throw new Error('User not found');
      }

      const secret = user.generateMFASecret();
      await user.save();

      // Generate QR code URL
      const qrCodeUrl = `otpauth://totp/Ulasis%20Platform(${user.email})?secret=${secret.base32}&issuer=Ulasis%20Platform`;

      logger.info('MFA setup initiated', {
        userId,
        email: user.email,
      });

      return {
        success: true,
        message: 'MFA setup initiated. Scan the QR code with your authenticator app.',
        data: {
          secret: secret.base32,
          qr_code_url: qrCodeUrl,
          otpauth_url: secret.otpauth_url,
        },
      };
    } catch (error) {
      logger.error('MFA setup failed', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Verify and enable MFA for user
   * @param {number} userId - User ID
   * @param {string} token - MFA token to verify
   * @returns {Object} MFA enable result
   */
  async enableMFA(userId, token) {
    try {
      const user = await User.unscoped().findByPk(userId);
      if (!user || !user.is_active) {
        throw new Error('User not found');
      }

      if (!user.mfa_secret) {
        throw new Error('MFA setup not initiated');
      }

      const isValid = user.verifyMFAToken(token);
      if (!isValid) {
        throw new Error('Invalid MFA token');
      }

      await user.enableMFA();

      logger.info('MFA enabled successfully', {
        userId,
        email: user.email,
      });

      return {
        success: true,
        message: 'Multi-factor authentication enabled successfully',
      };
    } catch (error) {
      logger.error('MFA enable failed', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Disable MFA for user
   * @param {number} userId - User ID
   * @param {string} token - MFA token for verification
   * @returns {Object} MFA disable result
   */
  async disableMFA(userId, token) {
    try {
      const user = await User.unscoped().findByPk(userId);
      if (!user || !user.is_active) {
        throw new Error('User not found');
      }

      if (!user.mfa_enabled) {
        throw new Error('MFA is not enabled');
      }

      const isValid = user.verifyMFAToken(token);
      if (!isValid) {
        throw new Error('Invalid MFA token');
      }

      await user.disableMFA();

      logger.info('MFA disabled successfully', {
        userId,
        email: user.email,
      });

      return {
        success: true,
        message: 'Multi-factor authentication disabled successfully',
      };
    } catch (error) {
      logger.error('MFA disable failed', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {number} userId - User ID
   * @returns {User} User instance
   */
  getUserById(userId) {
    return User.unscoped().findByPk(userId);
  }

  /**
   * Logout user (invalidate session)
   * @param {string} refreshToken - Refresh token to invalidate
   * @returns {Object} Logout result
   */
  async logout(refreshToken) {
    try {
      const decoded = tokenUtils.decodeToken(refreshToken);
      const userId = decoded?.payload?.sub;

      // Add the refresh token to blacklist
      await tokenUtils.blacklistToken(refreshToken, 'logout', userId);

      logger.info('User logged out successfully', {
        userId,
        tokenJti: decoded?.payload?.jti,
      });

      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      logger.error('Logout failed', {
        error: error.message,
      });
      // Don't throw error for logout - always return success
      return {
        success: true,
        message: 'Logout successful',
      };
    }
  }
}

module.exports = new AuthService();
