'use strict';

const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../../src/app-test');
const { User, AdminUser, AdminRole } = require('../../src/models');
const enterpriseAdminService = require('../../src/services/enterpriseAdminService');

// Note: Not mocking enterprise admin service for integration tests to test actual functionality

describe('Enterprise Admin Integration Tests', () => {
  let testUser, testAdminUser, testRole, authToken, sessionId;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.INTEGRATION_TEST = 'true'; // Skip setup.js cleanup

    // Models are already initialized by app-test.js through database-test.js
    // Just wait for database to be fully ready
    await new Promise(resolve => setTimeout(resolve, 200));
    // Create test role with all necessary permissions
    testRole = await AdminRole.create({
      name: 'admin',
      display_name: 'Test Admin',
      permissions: [
        'users:read',
        'users:write',
        'analytics:read',
        'security_management',
        'dashboard_view',
        'admin_management',
        'activity_monitoring',
        'user_management',
        'reports_view',
        'reports_generate',
      ],
      level: 5,
    });

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await User.create({
      email: 'testadmin@example.com',
      first_name: 'Test',
      last_name: 'Admin',
      password_hash: hashedPassword,
      is_active: true,
    });

    // Create test admin user
    testAdminUser = await AdminUser.create({
      user_id: testUser.id,
      role_id: testRole.id,
      is_active: true,
      two_factor_enabled: false,
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testAdminUser) await testAdminUser.destroy();
    if (testUser) await testUser.destroy();
    if (testRole) await testRole.destroy();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/enterprise-admin/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/enterprise-admin/auth/login')
        .send({
          email: 'testadmin@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Admin login successful');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.adminUser).toBeDefined();
      // Cookie is only set when rememberMe is true, so we don't test it here
    });
  });

  describe('GET /api/v1/enterprise-admin/session', () => {
    it('should get session info with valid token', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/v1/enterprise-admin/auth/login')
        .send({
          email: 'testadmin@example.com',
          password: 'password123',
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .get('/api/v1/enterprise-admin/auth/session')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toBeDefined();
      expect(response.body.data.adminUser).toBeDefined();
      expect(response.body.data.adminUser.email).toBe('testadmin@example.com');
    });

    it('should reject session info request without token', async () => {
      const response = await request(app)
        .get('/api/v1/enterprise-admin/auth/session')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication Required');
    });

    it('should reject session info request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/enterprise-admin/auth/session')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid Token');
    });
  });

  describe('POST /api/v1/enterprise-admin/refresh-token', () => {
    it('should refresh token successfully', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/v1/enterprise-admin/auth/login')
        .send({
          email: 'testadmin@example.com',
          password: 'password123',
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .post('/api/v1/enterprise-admin/auth/refresh')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();
    });

    it('should reject token refresh without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/enterprise-admin/auth/refresh')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication Required');
    });
  });

  describe('POST /api/v1/enterprise-admin/logout', () => {
    it('should logout successfully', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/v1/enterprise-admin/auth/login')
        .send({
          email: 'testadmin@example.com',
          password: 'password123',
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .post('/api/v1/enterprise-admin/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Admin logout successful');
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/enterprise-admin/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication Required');
    });
  });

  describe('Two-Factor Authentication', () => {
    beforeEach(async () => {
      // Enable 2FA for test admin user
      await testAdminUser.update({
        two_factor_enabled: true,
        two_factor_secret: 'JBSWY3DPEHPK3PXP', // Test secret
      });
    });

    afterEach(async () => {
      // Disable 2FA after tests
      await testAdminUser.update({
        two_factor_enabled: false,
        two_factor_secret: null,
      });
    });

    it('should require 2FA token when 2FA is enabled', async () => {
      const response = await request(app)
        .post('/api/v1/enterprise-admin/auth/login')
        .send({
          email: 'testadmin@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.requiresTwoFactor).toBe(true);
      expect(response.body.message).toBe('Two-factor authentication token required');
    });

    it('should login successfully with valid 2FA token', async () => {
      // Mock 2FA verification to return true
      const EnterpriseAdminAuthMiddleware = require('../../src/middleware/enterpriseAdminAuth');
      EnterpriseAdminAuthMiddleware.verifyTwoFactorToken = jest.fn().mockReturnValue(true);

      const response = await request(app)
        .post('/api/v1/enterprise-admin/auth/login')
        .send({
          email: 'testadmin@example.com',
          password: 'password123',
          twoFactorToken: '123456',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Admin login successful');
      expect(response.body.data.adminUser.twoFactorEnabled).toBe(true);
    });

    it('should reject login with invalid 2FA token', async () => {
      // Mock 2FA verification to return false
      const EnterpriseAdminAuthMiddleware = require('../../src/middleware/enterpriseAdminAuth');
      EnterpriseAdminAuthMiddleware.verifyTwoFactorToken = jest.fn().mockReturnValue(false);

      const response = await request(app)
        .post('/api/v1/enterprise-admin/auth/login')
        .send({
          email: 'testadmin@example.com',
          password: 'password123',
          twoFactorToken: 'invalid-token',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid Two-Factor Token');
    });
  });

  describe('POST /api/v1/enterprise-admin/2fa/setup', () => {
    it('should setup 2FA successfully', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/v1/enterprise-admin/auth/login')
        .send({
          email: 'testadmin@example.com',
          password: 'password123',
        });

      const token = loginResponse.body.data.token;

      // Mock 2FA generation functions
      const EnterpriseAdminAuthMiddleware = require('../../src/middleware/enterpriseAdminAuth');
      EnterpriseAdminAuthMiddleware.generateTwoFactorSecret = jest.fn().mockReturnValue({
        base32: 'test-secret-base32',
        ascii: 'test-secret-ascii',
      });
      EnterpriseAdminAuthMiddleware.generateTwoFactorQRCode = jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode');

      const response = await request(app)
        .post('/api/v1/enterprise-admin/auth/2fa/setup')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Two-factor authentication setup initiated');
      expect(response.body.data.secret).toBe('test-secret-base32');
      expect(response.body.data.qrCode).toBe('data:image/png;base64,mockqrcode');
      expect(response.body.data.instructions).toBeDefined();
    });

    it('should reject 2FA setup without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/enterprise-admin/auth/2fa/setup')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication Required');
    });
  });

  describe('POST /api/v1/enterprise-admin/2fa/verify-enable', () => {
    it('should verify and enable 2FA successfully', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/api/v1/enterprise-admin/auth/login')
        .send({
          email: 'testadmin@example.com',
          password: 'password123',
        });

      const token = loginResponse.body.data.token;

      // First, set up 2FA
      await request(app)
        .post('/api/v1/enterprise-admin/auth/2fa/setup')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Mock 2FA verification to return true
      const EnterpriseAdminAuthMiddleware = require('../../src/middleware/enterpriseAdminAuth');
      EnterpriseAdminAuthMiddleware.verifyTwoFactorToken = jest.fn().mockReturnValue(true);

      const response = await request(app)
        .post('/api/v1/enterprise-admin/auth/2fa/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          token: '123456',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Two-factor authentication enabled successfully');
    });

    it('should reject 2FA verification without token', async () => {
      // Since 2FA is enabled from previous tests, we need to use a temporary token
      // Create a new admin user without 2FA for this test
      const tempRole = await AdminRole.create({
        name: 'temp_admin',
        display_name: 'Temp Admin',
        permissions: ['dashboard_view', 'security_management'],
        level: 1,
      });

      const hashedPassword = await bcrypt.hash('password123', 10);
      const tempUser = await User.create({
        email: 'tempadmin@example.com',
        first_name: 'Temp',
        last_name: 'Admin',
        password_hash: hashedPassword,
        is_active: true,
      });

      const tempAdmin = await AdminUser.create({
        user_id: tempUser.id,
        role_id: tempRole.id,
        is_active: true,
        two_factor_enabled: false,
      });

      // Login with temp admin to get a token
      const loginResponse = await request(app)
        .post('/api/v1/enterprise-admin/auth/login')
        .send({
          email: 'tempadmin@example.com',
          password: 'password123',
        })
        .expect(200);

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .post('/api/v1/enterprise-admin/auth/2fa/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');

      // Clean up temp admin
      await tempAdmin.destroy();
      await tempUser.destroy();
      await tempRole.destroy();
    });
  });

  describe('POST /api/v1/enterprise-admin/2fa/disable', () => {
    beforeEach(async () => {
      // Enable 2FA for test admin user
      await testAdminUser.update({
        two_factor_enabled: true,
        two_factor_secret: 'test-secret-base32',
      });
    });

    it('should disable 2FA successfully', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/api/v1/enterprise-admin/auth/login')
        .send({
          email: 'testadmin@example.com',
          password: 'password123',
          twoFactorToken: '123456', // Mock 2FA token
        });

      const token = loginResponse.body.data.token;

      // Mock 2FA verification to return true
      const EnterpriseAdminAuthMiddleware = require('../../src/middleware/enterpriseAdminAuth');
      EnterpriseAdminAuthMiddleware.verifyTwoFactorToken = jest.fn().mockReturnValue(true);

      const response = await request(app)
        .post('/api/v1/enterprise-admin/auth/2fa/disable')
        .set('Authorization', `Bearer ${token}`)
        .send({
          password: 'password123',
          token: '123456',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Two-factor authentication disabled successfully');
    });

    it('should reject 2FA disable without password and token', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/api/v1/enterprise-admin/auth/login')
        .send({
          email: 'testadmin@example.com',
          password: 'password123',
          twoFactorToken: '123456',
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .post('/api/v1/enterprise-admin/auth/2fa/disable')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBe('Password and 2FA token are required');
    });
  });

  describe('Permission-based Access Control', () => {
    let superAdminRole, superAdminUser, superAdminToken;

    beforeAll(async () => {
      // Create super admin role with all permissions
      superAdminRole = await AdminRole.create({
        name: 'super_admin',
        display_name: 'Super Admin',
        permissions: ['*'],
        level: 10,
      });

      // Create super admin user
      const superAdminUserData = await User.create({
        email: 'superadmin@example.com',
        first_name: 'Super',
        last_name: 'Admin',
        password_hash: await bcrypt.hash('password123', 10),
        is_active: true,
      });

      superAdminUser = await AdminUser.create({
        user_id: superAdminUserData.id,
        role_id: superAdminRole.id,
        is_active: true,
        two_factor_enabled: false,
      });

      // Login as super admin
      const loginResponse = await request(app)
        .post('/api/v1/enterprise-admin/auth/login')
        .send({
          email: 'testadmin@example.com',
          password: 'password123',
        });

      superAdminToken = loginResponse.body.data.token;
    });

    afterAll(async () => {
      if (superAdminUser) await superAdminUser.destroy();
      if (superAdminRole) await superAdminRole.destroy();
    });

    it('should allow access to protected endpoints with valid permissions', async () => {
      // Test accessing a protected endpoint (assuming it exists)
      const response = await request(app)
        .get('/api/v1/enterprise-admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200); // This might be 404 if endpoint doesn't exist, but should not be 401/403

      // If endpoint exists, it should return success
      // If endpoint doesn't exist, it should return 404, not 401/403
      expect([200, 404]).toContain(response.status);
    });

    it('should reject access to endpoints without required permissions', async () => {
      // Create limited admin role
      const limitedRole = await AdminRole.create({
        name: 'analyst',
        display_name: 'Limited Admin',
        permissions: ['users:read'], // Only read permissions
        level: 1,
      });

      // Create limited admin user
      const limitedUserData = await User.create({
        email: 'limitedadmin@example.com',
        first_name: 'Limited',
        last_name: 'Admin',
        password_hash: await bcrypt.hash('password123', 10),
        is_active: true,
      });

      const limitedAdminUser = await AdminUser.create({
        user_id: limitedUserData.id,
        role_id: limitedRole.id,
        is_active: true,
        two_factor_enabled: false,
      });

      // Login as limited admin
      const loginResponse = await request(app)
        .post('/api/v1/enterprise-admin/auth/login')
        .send({
          email: 'limitedadmin@example.com',
          password: 'password123',
        });

      const limitedToken = loginResponse.body.data.token;

      // Try to access an endpoint that requires higher permissions
      const response = await request(app)
        .post('/api/v1/enterprise-admin/users/bulk-operations') // This requires 'user_management' permission
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({
          operation: 'delete',
          userIds: [1, 2],
        })
        .expect(403); // Should be forbidden

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient Permissions');

      // Clean up
      await limitedAdminUser.destroy();
      await limitedUserData.destroy();
      await limitedRole.destroy();
    });
  });

  describe('Rate Limiting', () => {
    it('should allow normal request rate', async () => {
      // Make multiple requests within rate limit
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/v1/enterprise-admin/auth/login')
          .send({
            email: 'testadmin@example.com',
            password: 'wrongpassword', // Wrong password to trigger rate limiting tracking
          });

        // Should be 401 for wrong password, not 429 for rate limiting
        expect(response.status).toBe(401);
      }
    });

    it('should implement account lockout after failed attempts', async () => {
      // Make multiple failed login attempts to trigger lockout
      for (let i = 0; i < 6; i++) {
        const response = await request(app)
          .post('/api/v1/enterprise-admin/auth/login')
          .send({
            email: 'lockouttest@example.com',
            password: 'wrongpassword',
          });

        if (i < 5) {
          expect(response.status).toBe(401);
        } else {
          // Should be locked out on 6th attempt
          expect(response.status).toBe(429);
          expect(response.body.error).toBe('Account Locked');
        }
      }
    });
  });

  describe('Security Headers and Response Format', () => {
    beforeEach(async () => {
      // Add delay to avoid rate limiting from previous tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should include security headers in responses', async () => {
      // Use the session endpoint without authentication to get a 401 response
      // This response should still include security headers
      const response = await request(app)
        .get('/api/v1/enterprise-admin/session')
        .expect(401);

      // Check for standard security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should include timestamp and request ID in responses', async () => {
      // Use the session endpoint without authentication to get a 401 response
      // This response should still include timestamp and request ID
      const response = await request(app)
        .get('/api/v1/enterprise-admin/session')
        .expect(401);

      expect(response.body.timestamp).toBeDefined();
      expect(response.body.requestId).toBeDefined();
    });

    it('should sanitize error messages', async () => {
      // Use a different endpoint to test error sanitization
      // Try accessing an endpoint without authentication
      const response = await request(app)
        .get('/api/v1/enterprise-admin/session')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
      // Should not expose internal error details
      expect(response.body.stack).toBeUndefined();
    });
  });
});