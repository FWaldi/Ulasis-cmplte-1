'use strict';

// Mock dependencies BEFORE importing
jest.mock('../../src/models');
jest.mock('../../src/services/enterpriseAdminService');
jest.mock('../../src/utils/logger');
jest.mock('bcrypt');
jest.mock('speakeasy');
jest.mock('qrcode');

// Unmock the controller to use actual implementation
jest.unmock('../../src/controllers/enterpriseAdminAuthController');

const EnterpriseAdminAuthController = require('../../src/controllers/enterpriseAdminAuthController');
const EnterpriseAdminAuthMiddleware = require('../../src/middleware/enterpriseAdminAuth');
const enterpriseAdminService = require('../../src/services/enterpriseAdminService');

// Set up model mocks
const { User, AdminUser, AdminRole } = require('../../src/models');

// Mock the methods we need
User.findOne = jest.fn();
AdminUser.findByPk = jest.fn();
AdminUser.update = jest.fn();

// Mock EnterpriseAdminAuthMiddleware static methods
EnterpriseAdminAuthMiddleware.createSession = jest.fn();
EnterpriseAdminAuthMiddleware.generateSessionToken = jest.fn();
EnterpriseAdminAuthMiddleware.getEffectivePermissions = jest.fn();
EnterpriseAdminAuthMiddleware.trackFailedAttempt = jest.fn();
EnterpriseAdminAuthMiddleware.verifyTwoFactorToken = jest.fn();
EnterpriseAdminAuthMiddleware.destroySession = jest.fn();
EnterpriseAdminAuthMiddleware.getSession = jest.fn();
EnterpriseAdminAuthMiddleware.generateTwoFactorSecret = jest.fn();
EnterpriseAdminAuthMiddleware.generateTwoFactorQRCode = jest.fn();
EnterpriseAdminAuthMiddleware.clearFailedAttempts = jest.fn();

describe('EnterpriseAdminAuthController', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {
        authorization: 'Bearer mock-jwt-token',
      },
      ip: '127.0.0.1',
      get: jest.fn(() => 'Test User Agent'),
      requestId: 'test-request-id',
      sessionId: 'test-session-id',
      adminUser: {
        id: 1,
        user: { email: 'admin@example.com' },
        role: { name: 'Super Admin' },
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('adminLogin', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'admin@example.com',
        password: 'password123',
      };
    });

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        is_active: true,
        password_hash: 'hashedpassword',
        adminUser: {
          id: 1,
          is_active: true,
          two_factor_enabled: false,
          role: {
            id: 1,
            name: 'Super Admin',
            permissions: ['*'],
            level: 10,
          },
        },
      };

      User.findOne.mockResolvedValue(mockUser);
      require('bcrypt').compare.mockResolvedValue(true);

      // Mock session creation
      const mockSession = {
        sessionId: 'test-session-id',
        adminUserId: 1,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };
      EnterpriseAdminAuthMiddleware.createSession.mockReturnValue(mockSession);
      EnterpriseAdminAuthMiddleware.generateSessionToken.mockReturnValue('mock-jwt-token');
      EnterpriseAdminAuthMiddleware.getEffectivePermissions.mockReturnValue(['*']);

      enterpriseAdminService.updateAdminLogin.mockResolvedValue({});
      enterpriseAdminService.logActivity.mockResolvedValue({});

      await EnterpriseAdminAuthController.adminLogin(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' },
        include: expect.any(Array),
      });
      expect(require('bcrypt').compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Admin login successful',
          data: expect.objectContaining({
            token: 'mock-jwt-token',
            adminUser: expect.any(Object),
          }),
        }),
      );
    });

    it('should reject login with missing credentials', async () => {
      mockReq.body = { email: '', password: '' };

      await EnterpriseAdminAuthController.adminLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error',
          message: 'Email and password are required',
        }),
      );
    });

    it('should reject login for non-existent user', async () => {
      User.findOne.mockResolvedValue(null);

      await EnterpriseAdminAuthController.adminLogin(mockReq, mockRes);

      expect(EnterpriseAdminAuthMiddleware.trackFailedAttempt).toHaveBeenCalledWith('admin@example.com');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid Credentials',
        }),
      );
    });

    it('should reject login for inactive user', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        is_active: false,
        adminUser: { is_active: true },
      };

      User.findOne.mockResolvedValue(mockUser);

      await EnterpriseAdminAuthController.adminLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Account Inactive',
        }),
      );
    });

    it('should reject login for inactive admin user', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        is_active: true,
        adminUser: { is_active: false },
      };

      User.findOne.mockResolvedValue(mockUser);

      await EnterpriseAdminAuthController.adminLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Admin Access Revoked',
        }),
      );
    });

    it('should reject login with invalid password', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        is_active: true,
        password_hash: 'hashedpassword',
        adminUser: { is_active: true },
      };

      User.findOne.mockResolvedValue(mockUser);
      require('bcrypt').compare.mockResolvedValue(false);

      await EnterpriseAdminAuthController.adminLogin(mockReq, mockRes);

      expect(EnterpriseAdminAuthMiddleware.trackFailedAttempt).toHaveBeenCalledWith('admin@example.com');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid Credentials',
        }),
      );
    });

    it('should require 2FA when enabled', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        is_active: true,
        password_hash: 'hashedpassword',
        adminUser: {
          id: 1,
          is_active: true,
          two_factor_enabled: true,
          two_factor_secret: 'test-secret',
        },
      };

      User.findOne.mockResolvedValue(mockUser);
      require('bcrypt').compare.mockResolvedValue(true);

      await EnterpriseAdminAuthController.adminLogin(mockReq, mockRes);

      // Check that User.findOne was called correctly
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' },
        include: expect.any(Array),
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          requiresTwoFactor: true,
          message: 'Two-factor authentication token required',
        }),
      );
    });

    it('should login successfully with valid 2FA token', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        is_active: true,
        password_hash: 'hashedpassword',
        adminUser: {
          id: 1,
          is_active: true,
          two_factor_enabled: true,
          two_factor_secret: 'test-secret',
          role: {
            id: 1,
            name: 'Super Admin',
            permissions: ['*'],
            level: 10,
          },
        },
      };

      mockReq.body.twoFactorToken = '123456';

      User.findOne.mockResolvedValue(mockUser);
      require('bcrypt').compare.mockResolvedValue(true);
      EnterpriseAdminAuthMiddleware.verifyTwoFactorToken.mockReturnValue(true);

      const mockSession = {
        sessionId: 'test-session-id',
        adminUserId: 1,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };
      EnterpriseAdminAuthMiddleware.createSession.mockReturnValue(mockSession);
      EnterpriseAdminAuthMiddleware.generateSessionToken.mockReturnValue('mock-jwt-token');
      EnterpriseAdminAuthMiddleware.getEffectivePermissions.mockReturnValue(['*']);

      enterpriseAdminService.updateAdminLogin.mockResolvedValue({});

      await EnterpriseAdminAuthController.adminLogin(mockReq, mockRes);

      expect(EnterpriseAdminAuthMiddleware.verifyTwoFactorToken).toHaveBeenCalledWith('test-secret', '123456');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Admin login successful',
        }),
      );
    });

    it('should reject login with invalid 2FA token', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        is_active: true,
        password_hash: 'hashedpassword',
        adminUser: {
          id: 1,
          is_active: true,
          two_factor_enabled: true,
          two_factor_secret: 'test-secret',
        },
      };

      mockReq.body.twoFactorToken = 'invalid-token';

      User.findOne.mockResolvedValue(mockUser);
      require('bcrypt').compare.mockResolvedValue(true);
      EnterpriseAdminAuthMiddleware.verifyTwoFactorToken.mockReturnValue(false);

      await EnterpriseAdminAuthController.adminLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid Two-Factor Token',
        }),
      );
    });

    it('should set remember me cookie when requested', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        is_active: true,
        password_hash: 'hashedpassword',
        adminUser: {
          id: 1,
          is_active: true,
          two_factor_enabled: false,
          role: {
            id: 1,
            name: 'Super Admin',
            permissions: ['*'],
            level: 10,
          },
        },
      };

      mockReq.body.rememberMe = true;

      User.findOne.mockResolvedValue(mockUser);
      require('bcrypt').compare.mockResolvedValue(true);

      const mockSession = {
        sessionId: 'test-session-id',
        adminUserId: 1,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };
      EnterpriseAdminAuthMiddleware.createSession.mockReturnValue(mockSession);
      EnterpriseAdminAuthMiddleware.generateSessionToken.mockReturnValue('mock-jwt-token');
      EnterpriseAdminAuthMiddleware.getEffectivePermissions.mockReturnValue(['*']);

      enterpriseAdminService.updateAdminLogin.mockResolvedValue({});

      await EnterpriseAdminAuthController.adminLogin(mockReq, mockRes);

      expect(mockRes.cookie).toHaveBeenCalledWith('adminToken', 'mock-jwt-token', {
        httpOnly: true,
        secure: false, // NODE_ENV is not 'production' in test
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    });
  });

  describe('adminLogout', () => {
    it('should logout successfully', async () => {
      enterpriseAdminService.logActivity.mockResolvedValue({});

      await EnterpriseAdminAuthController.adminLogout(mockReq, mockRes);

      expect(EnterpriseAdminAuthMiddleware.destroySession).toHaveBeenCalledWith('test-session-id');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('adminToken');
      expect(enterpriseAdminService.logActivity).toHaveBeenCalledWith(
        1,
        'ADMIN_LOGOUT',
        'session',
        null,
        {},
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Admin logout successful',
        }),
      );
    });

    it('should handle logout without session', async () => {
      delete mockReq.sessionId;

      await EnterpriseAdminAuthController.adminLogout(mockReq, mockRes);

      expect(EnterpriseAdminAuthMiddleware.destroySession).not.toHaveBeenCalled();
      expect(mockRes.clearCookie).toHaveBeenCalledWith('adminToken');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockSession = {
        sessionId: 'test-session-id',
        adminUserId: 1,
        lastActivity: Date.now(),
      };

      EnterpriseAdminAuthMiddleware.getSession.mockReturnValue(mockSession);
      EnterpriseAdminAuthMiddleware.generateSessionToken.mockReturnValue('new-jwt-token');

      await EnterpriseAdminAuthController.refreshToken(mockReq, mockRes);

      expect(EnterpriseAdminAuthMiddleware.generateSessionToken).toHaveBeenCalledWith(1, 'test-session-id');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Token refreshed successfully',
          data: {
            token: 'new-jwt-token',
            expiresAt: expect.any(String),
          },
        }),
      );
    });

    it('should reject refresh without session', async () => {
      delete mockReq.sessionId;

      await EnterpriseAdminAuthController.refreshToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid Session',
        }),
      );
    });
  });

  describe('setupTwoFactor', () => {
    it('should setup 2FA successfully', async () => {
      const mockSecret = {
        base32: 'test-secret-base32',
      };
      const mockQRCode = 'data:image/png;base64,mockqrcode';

      EnterpriseAdminAuthMiddleware.generateTwoFactorSecret.mockReturnValue(mockSecret);
      EnterpriseAdminAuthMiddleware.generateTwoFactorQRCode.mockResolvedValue(mockQRCode);
      AdminUser.update.mockResolvedValue({});
      enterpriseAdminService.logActivity.mockResolvedValue({});

      await EnterpriseAdminAuthController.setupTwoFactor(mockReq, mockRes);

      expect(EnterpriseAdminAuthMiddleware.generateTwoFactorSecret).toHaveBeenCalled();
      expect(EnterpriseAdminAuthMiddleware.generateTwoFactorQRCode).toHaveBeenCalledWith(mockSecret);
      expect(AdminUser.update).toHaveBeenCalledWith(
        { two_factor_secret: 'test-secret-base32' },
        { where: { id: 1 } },
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Two-factor authentication setup initiated',
          data: {
            secret: 'test-secret-base32',
            qrCode: mockQRCode,
            backupCodes: [],
            instructions: expect.any(Array),
          },
        }),
      );
    });

    it('should handle 2FA setup errors', async () => {
      EnterpriseAdminAuthMiddleware.generateTwoFactorSecret.mockImplementation(() => {
        throw new Error('Failed to generate secret');
      });

      await EnterpriseAdminAuthController.setupTwoFactor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '2FA Setup Error',
        }),
      );
    });
  });

  describe('verifyAndEnableTwoFactor', () => {
    beforeEach(() => {
      mockReq.body.token = '123456';
    });

    it('should verify and enable 2FA successfully', async () => {
      const mockAdminUser = {
        id: 1,
        two_factor_secret: 'test-secret',
      };

      AdminUser.findByPk.mockResolvedValue(mockAdminUser);
      EnterpriseAdminAuthMiddleware.verifyTwoFactorToken.mockReturnValue(true);
      AdminUser.update.mockResolvedValue({});
      enterpriseAdminService.logActivity.mockResolvedValue({});

      await EnterpriseAdminAuthController.verifyAndEnableTwoFactor(mockReq, mockRes);

      expect(AdminUser.findByPk).toHaveBeenCalledWith(1);
      expect(EnterpriseAdminAuthMiddleware.verifyTwoFactorToken).toHaveBeenCalledWith('test-secret', '123456');
      expect(AdminUser.update).toHaveBeenCalledWith(
        { two_factor_enabled: true },
        { where: { id: 1 } },
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Two-factor authentication enabled successfully',
        }),
      );
    });

    it('should reject verification without token', async () => {
      mockReq.body.token = '';

      await EnterpriseAdminAuthController.verifyAndEnableTwoFactor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error',
          message: 'Verification token is required',
        }),
      );
    });

    it('should reject verification for admin without secret', async () => {
      AdminUser.findByPk.mockResolvedValue(null);

      await EnterpriseAdminAuthController.verifyAndEnableTwoFactor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Setup Required',
        }),
      );
    });

    it('should reject verification with invalid token', async () => {
      const mockAdminUser = {
        id: 1,
        two_factor_secret: 'test-secret',
      };

      AdminUser.findByPk.mockResolvedValue(mockAdminUser);
      EnterpriseAdminAuthMiddleware.verifyTwoFactorToken.mockReturnValue(false);

      await EnterpriseAdminAuthController.verifyAndEnableTwoFactor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid Token',
        }),
      );
    });
  });

  describe('disableTwoFactor', () => {
    beforeEach(() => {
      mockReq.body = {
        password: 'password123',
        token: '123456',
      };
    });

    it('should disable 2FA successfully', async () => {
      const mockAdminUser = {
        id: 1,
        two_factor_secret: 'test-secret',
        user: {
          password_hash: 'hashedpassword',
        },
      };

      AdminUser.findByPk.mockResolvedValue(mockAdminUser);
      require('bcrypt').compare.mockResolvedValue(true);
      EnterpriseAdminAuthMiddleware.verifyTwoFactorToken.mockReturnValue(true);
      AdminUser.update.mockResolvedValue({});
      enterpriseAdminService.logActivity.mockResolvedValue({});

      await EnterpriseAdminAuthController.disableTwoFactor(mockReq, mockRes);

      expect(require('bcrypt').compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(EnterpriseAdminAuthMiddleware.verifyTwoFactorToken).toHaveBeenCalledWith('test-secret', '123456');
      expect(AdminUser.update).toHaveBeenCalledWith(
        {
          two_factor_enabled: false,
          two_factor_secret: null,
        },
        { where: { id: 1 } },
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Two-factor authentication disabled successfully',
        }),
      );
    });

    it('should reject disable without password and token', async () => {
      mockReq.body = { password: '', token: '' };

      await EnterpriseAdminAuthController.disableTwoFactor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error',
          message: 'Password and 2FA token are required',
        }),
      );
    });

    it('should reject disable with invalid password', async () => {
      const mockAdminUser = {
        id: 1,
        two_factor_secret: 'test-secret',
        user: {
          password_hash: 'hashedpassword',
        },
      };

      AdminUser.findByPk.mockResolvedValue(mockAdminUser);
      require('bcrypt').compare.mockResolvedValue(false);

      await EnterpriseAdminAuthController.disableTwoFactor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid Password',
        }),
      );
    });

    it('should reject disable with invalid 2FA token', async () => {
      const mockAdminUser = {
        id: 1,
        two_factor_secret: 'test-secret',
        user: {
          password_hash: 'hashedpassword',
        },
      };

      AdminUser.findByPk.mockResolvedValue(mockAdminUser);
      require('bcrypt').compare.mockResolvedValue(true);
      EnterpriseAdminAuthMiddleware.verifyTwoFactorToken.mockReturnValue(false);

      await EnterpriseAdminAuthController.disableTwoFactor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid Token',
        }),
      );
    });
  });

  describe('getSessionInfo', () => {
    it('should return session info successfully', async () => {
      const mockSession = {
        sessionId: 'test-session-id',
        createdAt: Date.now(),
        lastActivity: Date.now(),
        ipAddress: '127.0.0.1',
        twoFactorVerified: true,
      };

      EnterpriseAdminAuthMiddleware.getSession.mockReturnValue(mockSession);

      await EnterpriseAdminAuthController.getSessionInfo(mockReq, mockRes);

      expect(EnterpriseAdminAuthMiddleware.getSession).toHaveBeenCalledWith('test-session-id');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            session: {
              sessionId: 'test-session-id',
              createdAt: mockSession.createdAt,
              lastActivity: mockSession.lastActivity,
              ipAddress: '127.0.0.1',
              twoFactorVerified: true,
            },
            adminUser: {
              id: 1,
              email: 'admin@example.com',
              firstName: undefined,
              lastName: undefined,
              role: { name: 'Super Admin' },
              permissions: undefined,
              twoFactorEnabled: undefined,
            },
          },
        }),
      );
    });

    it('should return error for missing session', async () => {
      EnterpriseAdminAuthMiddleware.getSession.mockReturnValue(null);

      await EnterpriseAdminAuthController.getSessionInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Session Not Found',
        }),
      );
    });
  });
});