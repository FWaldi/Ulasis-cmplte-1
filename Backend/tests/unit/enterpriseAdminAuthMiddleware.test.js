'use strict';

// Mock dependencies but not the middleware itself
jest.mock('../../src/models');
jest.mock('../../src/utils/logger');
jest.mock('jsonwebtoken');
jest.mock('speakeasy');
jest.mock('qrcode');

// Unmock the middleware to test actual implementation
jest.unmock('../../src/middleware/enterpriseAdminAuth');
const EnterpriseAdminAuthMiddleware = require('../../src/middleware/enterpriseAdminAuth');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../src/models');
jest.mock('../../src/utils/logger');
jest.mock('jsonwebtoken');
jest.mock('speakeasy');
jest.mock('qrcode');

// Set up model mocks
const { AdminUser, User, AdminRole } = require('../../src/models');

// Mock specific static methods that need custom behavior
beforeAll(() => {
  // Don't mock these methods - we want to test the actual implementation
  // Only mock external dependencies
});

describe('EnterpriseAdminAuthMiddleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {},
      query: {},
      params: {},
      body: {},
      ip: '127.0.0.1',
      get: jest.fn((header) => {
        if (header === 'User-Agent') return 'Test User Agent';
        return null;
      }),
      requestId: 'test-request-id',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();

    // Clear session store and failed attempts
    EnterpriseAdminAuthMiddleware.sessionStore.clear();
    EnterpriseAdminAuthMiddleware.failedAttempts.clear();
  });

  describe('authenticate', () => {
    beforeEach(() => {
      // Setup valid session
      const mockSession = {
        sessionId: 'test-session-id',
        adminUserId: 1,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        twoFactorVerified: true,
      };
      EnterpriseAdminAuthMiddleware.sessionStore.set('test-session-id', mockSession);
    });

    it('should authenticate with valid Bearer token', async () => {
      const mockAdminUser = {
        id: 1,
        is_active: true,
        user: {
          id: 1,
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User',
          is_active: true,
        },
        role: {
          id: 1,
          name: 'Super Admin',
          permissions: ['*'],
          level: 10,
        },
      };

      mockReq.headers.authorization = 'Bearer valid-jwt-token';

      const decodedToken = {
        adminUserId: 1,
        sessionId: 'test-session-id',
        type: 'enterprise_admin',
      };

      require('jsonwebtoken').verify.mockReturnValue(decodedToken);
      AdminUser.findByPk.mockResolvedValue(mockAdminUser);


      await EnterpriseAdminAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(require('jsonwebtoken').verify).toHaveBeenCalledWith('valid-jwt-token', process.env.JWT_SECRET);
      expect(AdminUser.findByPk).toHaveBeenCalledWith(1, {
        include: expect.any(Array),
      });
      expect(mockReq.adminUser).toEqual(mockAdminUser);
      expect(mockReq.sessionId).toBe('test-session-id');
      expect(mockReq.adminPermissions).toEqual(['*']);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject authentication without token', async () => {
      await EnterpriseAdminAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication Required',
          message: 'Enterprise admin token is required',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should authenticate with cookie token', async () => {
      const mockAdminUser = {
        id: 1,
        is_active: true,
        user: { id: 1, email: 'admin@example.com', is_active: true },
        role: { id: 1, name: 'Super Admin', permissions: ['*'], level: 10 },
      };

      mockReq.cookies.adminToken = 'cookie-jwt-token';

      const decodedToken = {
        adminUserId: 1,
        sessionId: 'test-session-id',
        type: 'enterprise_admin',
      };

      require('jsonwebtoken').verify.mockReturnValue(decodedToken);
      AdminUser.findByPk.mockResolvedValue(mockAdminUser);


      await EnterpriseAdminAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(require('jsonwebtoken').verify).toHaveBeenCalledWith('cookie-jwt-token', process.env.JWT_SECRET);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate with query token', async () => {
      const mockAdminUser = {
        id: 1,
        is_active: true,
        user: { id: 1, email: 'admin@example.com', is_active: true },
        role: { id: 1, name: 'Super Admin', permissions: ['*'], level: 10 },
      };

      mockReq.query.token = 'query-jwt-token';

      const decodedToken = {
        adminUserId: 1,
        sessionId: 'test-session-id',
        type: 'enterprise_admin',
      };

      require('jsonwebtoken').verify.mockReturnValue(decodedToken);
      AdminUser.findByPk.mockResolvedValue(mockAdminUser);


      await EnterpriseAdminAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(require('jsonwebtoken').verify).toHaveBeenCalledWith('query-jwt-token', process.env.JWT_SECRET);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject authentication for invalid JWT token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      const jwtError = new Error('Invalid token');
      jwtError.name = 'JsonWebTokenError';
      require('jsonwebtoken').verify.mockImplementation(() => {
        throw jwtError;
      });

      await EnterpriseAdminAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid Token',
          message: 'The provided token is invalid',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject authentication for expired JWT token', async () => {
      mockReq.headers.authorization = 'Bearer expired-token';

      const jwtError = new Error('Token expired');
      jwtError.name = 'TokenExpiredError';
      require('jsonwebtoken').verify.mockImplementation(() => {
        throw jwtError;
      });

      await EnterpriseAdminAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Token Expired',
          message: 'The provided token has expired',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject authentication for non-existent admin user', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';

      const decodedToken = {
        adminUserId: 999,
        sessionId: 'test-session-id',
        type: 'enterprise_admin',
      };

      require('jsonwebtoken').verify.mockReturnValue(decodedToken);
      AdminUser.findByPk.mockResolvedValue(null);

      await EnterpriseAdminAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid Admin User',
          message: 'Admin user not found or inactive',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject authentication for inactive admin user', async () => {
      const mockAdminUser = {
        id: 1,
        is_active: false,
        user: { id: 1, email: 'admin@example.com', is_active: true },
        role: { id: 1, name: 'Super Admin', permissions: ['*'], level: 10 },
      };

      mockReq.headers.authorization = 'Bearer valid-token';

      const decodedToken = {
        adminUserId: 1,
        sessionId: 'test-session-id',
        type: 'enterprise_admin',
      };

      require('jsonwebtoken').verify.mockReturnValue(decodedToken);
      AdminUser.findByPk.mockResolvedValue(mockAdminUser);

      await EnterpriseAdminAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid Admin User',
          message: 'Admin user not found or inactive',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject authentication for inactive user account', async () => {
      const mockAdminUser = {
        id: 1,
        is_active: true,
        user: { id: 1, email: 'admin@example.com', is_active: false },
        role: { id: 1, name: 'Super Admin', permissions: ['*'], level: 10 },
      };

      mockReq.headers.authorization = 'Bearer valid-token';

      const decodedToken = {
        adminUserId: 1,
        sessionId: 'test-session-id',
        type: 'enterprise_admin',
      };

      require('jsonwebtoken').verify.mockReturnValue(decodedToken);
      AdminUser.findByPk.mockResolvedValue(mockAdminUser);

      await EnterpriseAdminAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid User Account',
          message: 'Associated user account is inactive',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject authentication for invalid session', async () => {
      const mockAdminUser = {
        id: 1,
        is_active: true,
        user: { id: 1, email: 'admin@example.com', is_active: true },
        role: { id: 1, name: 'Super Admin', permissions: ['*'], level: 10 },
      };

      mockReq.headers.authorization = 'Bearer valid-token';

      const decodedToken = {
        adminUserId: 1,
        sessionId: 'invalid-session-id',
        type: 'enterprise_admin',
      };

      require('jsonwebtoken').verify.mockReturnValue(decodedToken);
      AdminUser.findByPk.mockResolvedValue(mockAdminUser);

      await EnterpriseAdminAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid Session',
          message: 'Admin session has expired or is invalid',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should require 2FA when enabled but not verified', async () => {
      const mockAdminUser = {
        id: 1,
        is_active: true,
        two_factor_enabled: true,
        user: { id: 1, email: 'admin@example.com', is_active: true },
        role: { id: 1, name: 'Super Admin', permissions: ['*'], level: 10 },
      };

      // Setup session without 2FA verification
      const mockSession = {
        sessionId: 'test-session-id',
        adminUserId: 1,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        twoFactorVerified: false,
      };
      EnterpriseAdminAuthMiddleware.sessionStore.set('test-session-id', mockSession);

      mockReq.headers.authorization = 'Bearer valid-token';

      const decodedToken = {
        adminUserId: 1,
        sessionId: 'test-session-id',
        type: 'enterprise_admin',
      };

      require('jsonwebtoken').verify.mockReturnValue(decodedToken);
      AdminUser.findByPk.mockResolvedValue(mockAdminUser);

      await EnterpriseAdminAuthMiddleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Two-Factor Authentication Required',
          message: 'Please complete 2FA verification',
          requiresTwoFactor: true,
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    beforeEach(() => {
      mockReq.adminUser = {
        id: 1,
        email: 'admin@example.com',
      };
      mockReq.adminPermissions = ['users:read', 'users:write'];
    });

    it('should allow access with valid permission', () => {
      const middleware = EnterpriseAdminAuthMiddleware.requirePermission('users:read');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access with wildcard permission', () => {
      mockReq.adminPermissions = ['*'];
      const middleware = EnterpriseAdminAuthMiddleware.requirePermission('any:permission');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access without required permission', () => {
      const middleware = EnterpriseAdminAuthMiddleware.requirePermission('admin:delete');

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Insufficient Permissions',
          message: 'You do not have permission to perform this action. Required: admin:delete',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access without authentication', () => {
      delete mockReq.adminUser;
      const middleware = EnterpriseAdminAuthMiddleware.requirePermission('users:read');

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication Required',
          message: 'Admin authentication is required',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRoleLevel', () => {
    beforeEach(() => {
      mockReq.adminUser = {
        id: 1,
        role: {
          level: 5,
        },
      };
    });

    it('should allow access with sufficient role level', () => {
      const middleware = EnterpriseAdminAuthMiddleware.requireRoleLevel(3);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access with insufficient role level', () => {
      const middleware = EnterpriseAdminAuthMiddleware.requireRoleLevel(8);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Insufficient Role Level',
          message: 'Your role level is insufficient. Required: 8, Current: 5',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access without role', () => {
      delete mockReq.adminUser.role;
      const middleware = EnterpriseAdminAuthMiddleware.requireRoleLevel(3);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication Required',
          message: 'Admin authentication is required',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('checkAccountLockout', () => {
    it('should allow access when no failed attempts', () => {
      mockReq.body.email = 'test@example.com';

      EnterpriseAdminAuthMiddleware.checkAccountLockout(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access when failed attempts are below threshold', () => {
      mockReq.body.email = 'test@example.com';
      EnterpriseAdminAuthMiddleware.failedAttempts.set('test@example.com', {
        count: 3,
        lastAttempt: Date.now(),
      });

      EnterpriseAdminAuthMiddleware.checkAccountLockout(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should lock account when failed attempts exceed threshold', () => {
      mockReq.body.email = 'test@example.com';
      EnterpriseAdminAuthMiddleware.failedAttempts.set('test@example.com', {
        count: 5,
        lastAttempt: Date.now(),
      });

      EnterpriseAdminAuthMiddleware.checkAccountLockout(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Account Locked',
          message: expect.stringContaining('Too many failed login attempts'),
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should unlock account after lockout duration', () => {
      mockReq.body.email = 'test@example.com';
      const pastTime = Date.now() - (16 * 60 * 1000); // 16 minutes ago
      EnterpriseAdminAuthMiddleware.failedAttempts.set('test@example.com', {
        count: 5,
        lastAttempt: pastTime,
      });

      EnterpriseAdminAuthMiddleware.checkAccountLockout(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(EnterpriseAdminAuthMiddleware.failedAttempts.has('test@example.com')).toBe(false);
    });

    it('should use IP address when email is not provided', () => {
      mockReq.ip = '192.168.1.1';
      EnterpriseAdminAuthMiddleware.failedAttempts.set('192.168.1.1', {
        count: 5,
        lastAttempt: Date.now(),
      });

      EnterpriseAdminAuthMiddleware.checkAccountLockout(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('trackFailedAttempt', () => {
    it('should track failed attempt for new identifier', () => {
      EnterpriseAdminAuthMiddleware.trackFailedAttempt('test@example.com');

      const attempts = EnterpriseAdminAuthMiddleware.failedAttempts.get('test@example.com');
      expect(attempts).toEqual({
        count: 1,
        lastAttempt: expect.any(Number),
      });
    });

    it('should increment failed attempt count for existing identifier', () => {
      EnterpriseAdminAuthMiddleware.failedAttempts.set('test@example.com', {
        count: 2,
        lastAttempt: Date.now() - 1000,
      });

      EnterpriseAdminAuthMiddleware.trackFailedAttempt('test@example.com');

      const attempts = EnterpriseAdminAuthMiddleware.failedAttempts.get('test@example.com');
      expect(attempts.count).toBe(3);
      expect(attempts.lastAttempt).toBeGreaterThan(attempts.lastAttempt - 1000);
    });
  });

  describe('clearFailedAttempts', () => {
    it('should clear failed attempts for identifier', () => {
      EnterpriseAdminAuthMiddleware.failedAttempts.set('test@example.com', {
        count: 3,
        lastAttempt: Date.now(),
      });

      EnterpriseAdminAuthMiddleware.clearFailedAttempts('test@example.com');

      expect(EnterpriseAdminAuthMiddleware.failedAttempts.has('test@example.com')).toBe(false);
    });
  });

  describe('extractToken', () => {
    it('should extract token from Authorization header', () => {
      mockReq.headers.authorization = 'Bearer test-token';

      const token = EnterpriseAdminAuthMiddleware.extractToken(mockReq);

      expect(token).toBe('test-token');
    });

    it('should extract token from cookie', () => {
      mockReq.cookies.adminToken = 'cookie-token';

      const token = EnterpriseAdminAuthMiddleware.extractToken(mockReq);

      expect(token).toBe('cookie-token');
    });

    it('should extract token from query', () => {
      mockReq.query.token = 'query-token';

      const token = EnterpriseAdminAuthMiddleware.extractToken(mockReq);

      expect(token).toBe('query-token');
    });

    it('should return null when no token found', () => {
      const token = EnterpriseAdminAuthMiddleware.extractToken(mockReq);

      expect(token).toBeNull();
    });
  });

  describe('getEffectivePermissions', () => {
    it('should return wildcard permission when role has it', () => {
      const adminUser = {
        role: {
          permissions: ['*'],
        },
        permissions: ['custom:permission'],
      };

      const permissions = EnterpriseAdminAuthMiddleware.getEffectivePermissions(adminUser);

      expect(permissions).toEqual(['*']);
    });

    it('should merge role and custom permissions', () => {
      const adminUser = {
        role: {
          permissions: ['users:read', 'users:write'],
        },
        permissions: ['custom:permission', 'users:read'],
      };

      const permissions = EnterpriseAdminAuthMiddleware.getEffectivePermissions(adminUser);

      expect(permissions).toEqual(['users:read', 'users:write', 'custom:permission']);
    });

    it('should handle missing role', () => {
      const adminUser = {
        permissions: ['custom:permission'],
      };

      const permissions = EnterpriseAdminAuthMiddleware.getEffectivePermissions(adminUser);

      expect(permissions).toEqual(['custom:permission']);
    });
  });

  describe('Session Management', () => {
    it('should create session successfully', () => {
      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'Test User Agent',
      };

      const session = EnterpriseAdminAuthMiddleware.createSession(1, metadata);

      expect(session).toEqual({
        sessionId: expect.stringMatching(/^admin_\d+_[a-z0-9]+$/),
        adminUserId: 1,
        createdAt: expect.any(Number),
        lastActivity: expect.any(Number),
        ipAddress: '127.0.0.1',
        userAgent: 'Test User Agent',
        twoFactorVerified: false,
      });
      expect(EnterpriseAdminAuthMiddleware.sessionStore.has(session.sessionId)).toBe(true);
    });

    it('should get session successfully', () => {
      const session = {
        sessionId: 'test-session',
        adminUserId: 1,
      };
      EnterpriseAdminAuthMiddleware.sessionStore.set('test-session', session);

      const retrievedSession = EnterpriseAdminAuthMiddleware.getSession('test-session');

      expect(retrievedSession).toEqual(session);
    });

    it('should destroy session successfully', () => {
      const session = {
        sessionId: 'test-session',
        adminUserId: 1,
      };
      EnterpriseAdminAuthMiddleware.sessionStore.set('test-session', session);

      const result = EnterpriseAdminAuthMiddleware.destroySession('test-session');

      expect(result).toBe(true);
      expect(EnterpriseAdminAuthMiddleware.sessionStore.has('test-session')).toBe(false);
    });

    it('should verify session 2FA successfully', () => {
      const session = {
        sessionId: 'test-session',
        adminUserId: 1,
        twoFactorVerified: false,
        lastActivity: Date.now(),
      };
      EnterpriseAdminAuthMiddleware.sessionStore.set('test-session', session);

      const result = EnterpriseAdminAuthMiddleware.verifySessionTwoFactor('test-session');

      expect(result).toBe(true);
      const updatedSession = EnterpriseAdminAuthMiddleware.getSession('test-session');
      expect(updatedSession.twoFactorVerified).toBe(true);
      expect(updatedSession.lastActivity).toBeGreaterThanOrEqual(session.lastActivity);
    });
  });

  describe('Two-Factor Authentication', () => {
    it('should verify 2FA token successfully', () => {
      const secret = 'test-secret';
      const token = '123456';

      require('speakeasy').totp.verify.mockReturnValue(true);

      const result = EnterpriseAdminAuthMiddleware.verifyTwoFactorToken(secret, token);

      expect(require('speakeasy').totp.verify).toHaveBeenCalledWith({
        secret,
        encoding: 'base32',
        token,
        window: 2,
      });
      expect(result).toBe(true);
    });

    it('should generate 2FA secret successfully', () => {
      const mockSecret = {
        base32: 'test-secret-base32',
        ascii: 'test-secret-ascii',
      };

      require('speakeasy').generateSecret.mockReturnValue(mockSecret);

      const secret = EnterpriseAdminAuthMiddleware.generateTwoFactorSecret();

      expect(require('speakeasy').generateSecret).toHaveBeenCalledWith({
        name: `Ulasis Enterprise Admin (${process.env.APP_NAME || 'Ulasis'})`,
        issuer: 'Ulasis Enterprise',
        length: 32,
      });
      expect(secret).toEqual(mockSecret);
    });

    it('should generate 2FA QR code successfully', async () => {
      const mockSecret = {
        base32: 'test-secret-base32',
      };
      const mockQRCode = 'data:image/png;base64,mockqrcode';

      require('qrcode').toDataURL.mockResolvedValue(mockQRCode);

      const qrCode = await EnterpriseAdminAuthMiddleware.generateTwoFactorQRCode(mockSecret);

      expect(require('qrcode').toDataURL).toHaveBeenCalled();
      expect(qrCode).toBe(mockQRCode);
    });
  });

  describe('Rate Limiting', () => {
    it('should create admin rate limiter', () => {
      const rateLimiter = EnterpriseAdminAuthMiddleware.adminRateLimit();

      expect(rateLimiter).toBeDefined();
      // Rate limiter is a function, we can't easily test its internal configuration
      // but we can verify it doesn't throw an error
      expect(typeof rateLimiter).toBe('function');
    });

    it('should create strict rate limiter', () => {
      const rateLimiter = EnterpriseAdminAuthMiddleware.strictRateLimit();

      expect(rateLimiter).toBeDefined();
      expect(typeof rateLimiter).toBe('function');
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', () => {
      const now = Date.now();
      const expiredTime = now - (9 * 60 * 60 * 1000); // 9 hours ago
      const validTime = now - (1 * 60 * 60 * 1000); // 1 hour ago

      // Create expired session
      const expiredSession = {
        sessionId: 'expired-session',
        adminUserId: 1,
        lastActivity: expiredTime,
      };
      EnterpriseAdminAuthMiddleware.sessionStore.set('expired-session', expiredSession);

      // Create valid session
      const validSession = {
        sessionId: 'valid-session',
        adminUserId: 2,
        lastActivity: validTime,
      };
      EnterpriseAdminAuthMiddleware.sessionStore.set('valid-session', validSession);

      EnterpriseAdminAuthMiddleware.cleanupExpiredSessions();

      expect(EnterpriseAdminAuthMiddleware.sessionStore.has('expired-session')).toBe(false);
      expect(EnterpriseAdminAuthMiddleware.sessionStore.has('valid-session')).toBe(true);
    });
  });
});