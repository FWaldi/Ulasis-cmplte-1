'use strict';

const bcrypt = require('bcrypt');
const { User, AdminUser } = require('../models');
const EnterpriseAdminAuthMiddleware = require('../middleware/enterpriseAdminAuth');
const enterpriseAdminService = require('../services/enterpriseAdminService');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Enterprise Admin Authentication Controller
 */
class EnterpriseAdminAuthController {
  /**
   * Admin login with enhanced security
   */
  static async adminLogin(req, res) {
    const startTime = Date.now();
    const clientInfo = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceFingerprint: req.body.deviceFingerprint || null,
    };

    try {
      const { email, password, twoFactorToken, rememberMe = false } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Email and password are required',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      console.log('DEBUG: Looking for user with email:', email.toLowerCase());

      // Find user by email
      const models = require('../models');
      let user;
      try {
        user = await User.findOne({
          where: { email: email.toLowerCase() },
          include: [
            {
              model: AdminUser,
              as: 'adminUser',
              include: [
                {
                  model: models.AdminRole,
                  as: 'role',
                  attributes: ['id', 'name', 'permissions', 'level'],
                },
              ],
            },
          ],
        });
        console.log('DEBUG: User found:', !!user);
        if (user) {
          console.log('DEBUG: User has adminUser:', !!user.adminUser);
          if (user.adminUser) {
            console.log('DEBUG: AdminUser has role:', !!user.adminUser.role);
          }
        }
      } catch (dbError) {
        console.error('DEBUG: Database error:', dbError.message);
        throw dbError;
      }

      if (!user) {
        EnterpriseAdminAuthMiddleware.trackFailedAttempt(email);
        logger.warn('Admin login failed - user not found', { email, ...clientInfo });

        return res.status(401).json({
          success: false,
          error: 'Invalid Credentials',
          message: 'The email or password is incorrect',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      if (!user.is_active) {
        EnterpriseAdminAuthMiddleware.trackFailedAttempt(email);
        logger.warn('Admin login failed - user inactive', { email, userId: user.id, ...clientInfo });

        return res.status(401).json({
          success: false,
          error: 'Account Inactive',
          message: 'Your account has been deactivated',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      if (!user.adminUser || !user.adminUser.is_active) {
        EnterpriseAdminAuthMiddleware.trackFailedAttempt(email);
        logger.warn('Admin login failed - admin access revoked', { email, userId: user.id, ...clientInfo });

        return res.status(401).json({
          success: false,
          error: 'Admin Access Revoked',
          message: 'Your admin access has been revoked',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        EnterpriseAdminAuthMiddleware.trackFailedAttempt(email);
        logger.warn('Admin login failed - invalid password', { email, userId: user.id, ...clientInfo });

        return res.status(401).json({
          success: false,
          error: 'Invalid Credentials',
          message: 'The email or password is incorrect',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Clear failed attempts on successful password verification
      EnterpriseAdminAuthMiddleware.clearFailedAttempts(email);

      // Check 2FA requirement
      if (user.adminUser.two_factor_enabled) {
        if (!twoFactorToken) {
          // Return 2FA challenge
          return res.status(200).json({
            success: true,
            requiresTwoFactor: true,
            message: 'Two-factor authentication token required',
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
          });
        }

        // Verify 2FA token
        const isValidTwoFactor = EnterpriseAdminAuthMiddleware.verifyTwoFactorToken(
          user.adminUser.two_factor_secret,
          twoFactorToken,
        );

        if (!isValidTwoFactor) {
          logger.warn('Admin login failed - invalid 2FA token', {
            email,
            userId: user.id,
            ...clientInfo,
          });

          return res.status(401).json({
            success: false,
            error: 'Invalid Two-Factor Token',
            message: 'The two-factor authentication token is invalid',
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
          });
        }
      }

      // Create admin session
      const session = EnterpriseAdminAuthMiddleware.createSession(user.adminUser.id, clientInfo);

      // Mark 2FA as verified if applicable
      if (user.adminUser.two_factor_enabled && twoFactorToken) {
        EnterpriseAdminAuthMiddleware.verifySessionTwoFactor(session.sessionId);
      }

      // Generate JWT token
      const token = EnterpriseAdminAuthMiddleware.generateSessionToken(
        user.adminUser.id,
        session.sessionId,
      );

      // Update admin login tracking
      await enterpriseAdminService.updateAdminLogin(user.adminUser.id, {
        ...clientInfo,
        sessionId: session.sessionId,
        rememberMe,
      });

      // Get effective permissions
      const effectivePermissions = EnterpriseAdminAuthMiddleware.getEffectivePermissions(user.adminUser);

      // Log successful login
      logger.info('Admin login successful', {
        adminUserId: user.adminUser.id,
        email: user.email,
        role: user.adminUser.role?.name,
        sessionId: session.sessionId,
        ...clientInfo,
        duration: Date.now() - startTime,
      });

      // Set secure cookie if remember me is enabled
      if (rememberMe) {
        res.cookie('adminToken', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }

      res.status(200).json({
        success: true,
        message: 'Admin login successful',
        data: {
          token,
          adminUser: {
            id: user.adminUser.id,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
            },
            role: user.adminUser.role,
            permissions: effectivePermissions,
            lastLogin: user.adminUser.last_login_at,
            twoFactorEnabled: user.adminUser.two_factor_enabled,
          },
          session: {
            sessionId: session.sessionId,
            createdAt: session.createdAt,
          },
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      console.error('Admin login error details:', {
        error: error.message,
        stack: error.stack,
        email: req.body.email,
        ...clientInfo,
        duration: Date.now() - startTime,
      });

      logger.error('Admin login error', {
        error: error.message,
        stack: error.stack,
        email: req.body.email,
        ...clientInfo,
        duration: Date.now() - startTime,
      });

      res.status(500).json({
        success: false,
        error: 'Login Error',
        message: `An error occurred during login: ${error.message}`,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Admin logout
   */
  static async adminLogout(req, res) {
    try {
      const sessionId = req.sessionId;
      const adminUserId = req.adminUser?.id;

      // Destroy session
      if (sessionId) {
        EnterpriseAdminAuthMiddleware.destroySession(sessionId);
      }

      // Clear cookie
      res.clearCookie('adminToken');

      // Log logout activity
      if (adminUserId) {
        await enterpriseAdminService.logActivity(
          adminUserId,
          'ADMIN_LOGOUT',
          'session',
          null,
          {},
          {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            sessionId,
          },
        );

        logger.info('Admin logout successful', {
          adminUserId,
          sessionId,
          ipAddress: req.ip,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Admin logout successful',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Admin logout error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
        sessionId: req.sessionId,
      });

      res.status(500).json({
        success: false,
        error: 'Logout Error',
        message: 'An error occurred during logout',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Refresh admin token
   */
  static async refreshToken(req, res) {
    try {
      const sessionId = req.sessionId;
      const adminUserId = req.adminUser?.id;

      if (!sessionId || !adminUserId) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Session',
          message: 'No valid admin session found',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Generate new token
      const newToken = EnterpriseAdminAuthMiddleware.generateSessionToken(adminUserId, sessionId);

      // Update session activity
      const session = EnterpriseAdminAuthMiddleware.getSession(sessionId);
      if (session) {
        session.lastActivity = Date.now();
        EnterpriseAdminAuthMiddleware.sessionStore.set(sessionId, session);
      }

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Token refresh error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
        sessionId: req.sessionId,
      });

      res.status(500).json({
        success: false,
        error: 'Token Refresh Error',
        message: 'An error occurred while refreshing the token',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Setup two-factor authentication
   */
  static async setupTwoFactor(req, res) {
    try {
      const adminUserId = req.adminUser.id;

      // Generate 2FA secret
      const secret = EnterpriseAdminAuthMiddleware.generateTwoFactorSecret();

      // Generate QR code
      const qrCodeDataUrl = await EnterpriseAdminAuthMiddleware.generateTwoFactorQRCode(secret);

      // Store secret temporarily (not enabled yet)
      await AdminUser.update(
        {
          two_factor_secret: secret.base32,
          // Don't enable yet - user needs to verify first
        },
        { where: { id: adminUserId } },
      );

      // Log 2FA setup initiation
      await enterpriseAdminService.logActivity(
        adminUserId,
        'INITIATE_2FA_SETUP',
        'admin_user',
        adminUserId,
        {},
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionId,
        },
      );

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication setup initiated',
        data: {
          secret: secret.base32,
          qrCode: qrCodeDataUrl,
          backupCodes: [], // Generate backup codes if needed
          instructions: [
            'Scan the QR code with your authenticator app',
            'Enter the verification code to complete setup',
            'Save the backup codes in a secure location',
          ],
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('2FA setup error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
      });

      res.status(500).json({
        success: false,
        error: '2FA Setup Error',
        message: 'An error occurred during 2FA setup',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Verify and enable two-factor authentication
   */
  static async verifyAndEnableTwoFactor(req, res) {
    try {
      const { token } = req.body;
      const adminUserId = req.adminUser.id;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Verification token is required',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Get admin user with secret
      const adminUser = await AdminUser.findByPk(adminUserId);
      if (!adminUser || !adminUser.two_factor_secret) {
        return res.status(400).json({
          success: false,
          error: 'Setup Required',
          message: 'Two-factor authentication setup must be initiated first',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Verify token
      const isValidToken = EnterpriseAdminAuthMiddleware.verifyTwoFactorToken(
        adminUser.two_factor_secret,
        token,
      );

      if (!isValidToken) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Token',
          message: 'The verification token is invalid',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Enable 2FA
      await AdminUser.update(
        { two_factor_enabled: true },
        { where: { id: adminUserId } },
      );

      // Log 2FA enablement
      await enterpriseAdminService.logActivity(
        adminUserId,
        'ENABLE_2FA',
        'admin_user',
        adminUserId,
        {},
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionId,
        },
      );

      logger.info('2FA enabled successfully', {
        adminUserId,
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication enabled successfully',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('2FA verification error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
      });

      res.status(500).json({
        success: false,
        error: '2FA Verification Error',
        message: 'An error occurred during 2FA verification',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Disable two-factor authentication
   */
  static async disableTwoFactor(req, res) {
    try {
      const { password, token } = req.body;
      const adminUserId = req.adminUser.id;

      if (!password || !token) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Password and 2FA token are required',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Get admin user with user data
      const adminUser = await AdminUser.findByPk(adminUserId, {
        include: [{ model: User, as: 'user' }],
      });

      if (!adminUser) {
        return res.status(404).json({
          success: false,
          error: 'Admin User Not Found',
          message: 'Admin user not found',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, adminUser.user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Password',
          message: 'The password is incorrect',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Verify 2FA token
      const isValidToken = EnterpriseAdminAuthMiddleware.verifyTwoFactorToken(
        adminUser.two_factor_secret,
        token,
      );

      if (!isValidToken) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Token',
          message: 'The two-factor authentication token is invalid',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Disable 2FA
      await AdminUser.update(
        {
          two_factor_enabled: false,
          two_factor_secret: null,
        },
        { where: { id: adminUserId } },
      );

      // Log 2FA disablement
      await enterpriseAdminService.logActivity(
        adminUserId,
        'DISABLE_2FA',
        'admin_user',
        adminUserId,
        {},
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionId,
        },
      );

      logger.info('2FA disabled successfully', {
        adminUserId,
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication disabled successfully',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('2FA disable error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
      });

      res.status(500).json({
        success: false,
        error: '2FA Disable Error',
        message: 'An error occurred while disabling 2FA',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Get current admin session info
   */
  static async getSessionInfo(req, res) {
    try {
      const session = EnterpriseAdminAuthMiddleware.getSession(req.sessionId);

      if (!session) {
        return res.status(401).json({
          success: false,
          error: 'Session Not Found',
          message: 'Admin session not found or expired',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      res.status(200).json({
        success: true,
        data: {
          session: {
            sessionId: session.sessionId,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            ipAddress: session.ipAddress,
            twoFactorVerified: session.twoFactorVerified,
          },
          adminUser: {
            id: req.adminUser.id,
            email: req.adminUser.user.email,
            firstName: req.adminUser.user.first_name,
            lastName: req.adminUser.user.last_name,
            role: req.adminUser.role,
            permissions: req.adminPermissions,
            twoFactorEnabled: req.adminUser.two_factor_enabled,
          },
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Get session info error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
        sessionId: req.sessionId,
      });

      res.status(500).json({
        success: false,
        error: 'Session Info Error',
        message: 'An error occurred while retrieving session information',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Change admin password
   */
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const adminUserId = req.adminUser?.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Current password and new password are required',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Get admin user with user data to access password
      const adminUser = await AdminUser.findByPk(adminUserId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'password_hash', 'is_active']
          }
        ]
      });

      if (!adminUser || !adminUser.user) {
        return res.status(404).json({
          success: false,
          error: 'Admin Not Found',
          message: 'Admin user not found',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, adminUser.user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Current Password',
          message: 'The current password provided is incorrect',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password in User table
      await adminUser.user.update({ password_hash: hashedNewPassword });

      // Invalidate all existing sessions for this user for security
      EnterpriseAdminAuthMiddleware.invalidateAllUserSessions(adminUserId);

      logger.info('Admin password changed successfully', {
        adminUserId: adminUser.id,
        email: adminUser.email,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Change password error', {
        error: error.message,
        adminUserId: req.adminUser?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Password Change Error',
        message: 'An error occurred while changing password',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }
}

module.exports = EnterpriseAdminAuthController;