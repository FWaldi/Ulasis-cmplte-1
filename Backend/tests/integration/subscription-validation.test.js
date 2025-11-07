'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../src/app-test');
const { sequelize } = require('../../src/config/database-test');
const { User, Questionnaire, SubscriptionUsage } = require('../../src/models');

// Mock security middleware to prevent rate limiting hangs
jest.mock('../../src/middleware/security', () => ({
  validateInput: jest.fn().mockImplementation((req, res, next) => next()),
  rateLimiters: {
    general: jest.fn().mockImplementation((req, res, next) => next()),
    analytics: jest.fn().mockImplementation((req, res, next) => next()),
    auth: jest.fn().mockImplementation((req, res, next) => next()),
    submission: jest.fn().mockImplementation((req, res, next) => next()),
    qrGeneration: jest.fn().mockImplementation((req, res, next) => next()),
    anonymousSubmission: jest.fn().mockImplementation((req, res, next) => next()),
    qrScanTracking: jest.fn().mockImplementation((req, res, next) => next()),
  },
  helmetConfig: jest.fn().mockReturnValue((req, res, next) => next()),
  validateRequest: jest.fn().mockReturnValue((req, res, next) => next()),
  validationSchemas: {},
  securityHeaders: jest.fn().mockImplementation((req, res, next) => next()),
  ipWhitelist: jest.fn().mockReturnValue((req, res, next) => next()),
  requestSizeLimiter: jest.fn().mockReturnValue((req, res, next) => next()),
}));

describe('Subscription Functionality Validation', () => {
  let freeUser, starterUser, businessUser, adminUser;
  let freeToken, starterToken, businessToken, adminToken;

  beforeAll(async () => {
    // Ensure clean database
    await sequelize.sync({ force: true });

    // Create users with different subscription plans
    const users = [
      { email: 'free-user@example.com', plan: 'free', name: 'Free' },
      { email: 'starter-user@example.com', plan: 'starter', name: 'Starter' },
      { email: 'business-user@example.com', plan: 'business', name: 'Business' },
      { email: 'admin-user@example.com', plan: 'admin', name: 'Admin' },
    ];

    for (const userData of users) {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: userData.email,
          password: 'password123',
          first_name: userData.name,
          last_name: 'User',
        })
        .expect(201);

      const user = await User.findByPk(response.body.data.user_id);
      await user.update({
        subscription_plan: userData.plan,
        subscription_status: 'active',
        email_verified: true,
      });

      // Store user objects and get tokens
      switch (userData.plan) {
        case 'free':
          freeUser = user;
          const freeLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: userData.email, password: 'password123' });
          freeToken = freeLogin.body.data.accessToken;
          break;
        case 'starter':
          starterUser = user;
          const starterLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: userData.email, password: 'password123' });
          starterToken = starterLogin.body.data.accessToken;
          break;
        case 'business':
          businessUser = user;
          const businessLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: userData.email, password: 'password123' });
          businessToken = businessLogin.body.data.accessToken;
          break;
        case 'admin':
          adminUser = user;
          const adminLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: userData.email, password: 'password123' });
          adminToken = adminLogin.body.data.accessToken;
          break;
      }
    }
  });

  afterAll(async () => {
    await sequelize.sync({ force: true });
    await sequelize.close();
  });

  describe('Subscription Status Verification', () => {
    test('all users should have correct subscription status', async () => {
      // Test free user
      const freeResponse = await request(app)
        .get('/api/v1/subscription/current')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(freeResponse.body.success).toBe(true);
      expect(freeResponse.body.data.subscription_plan).toBe('free');
      expect(freeResponse.body.data.subscription_status).toBe('active');

      // Test starter user
      const starterResponse = await request(app)
        .get('/api/v1/subscription/current')
        .set('Authorization', `Bearer ${starterToken}`)
        .expect(200);

      expect(starterResponse.body.success).toBe(true);
      expect(starterResponse.body.data.subscription_plan).toBe('starter');
      expect(starterResponse.body.data.subscription_status).toBe('active');

      // Test business user
      const businessResponse = await request(app)
        .get('/api/v1/subscription/current')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(businessResponse.body.success).toBe(true);
      expect(businessResponse.body.data.subscription_plan).toBe('business');
      expect(businessResponse.body.data.subscription_status).toBe('active');

      // Test admin user
      const adminResponse = await request(app)
        .get('/api/v1/subscription/current')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminResponse.body.success).toBe(true);
      expect(adminResponse.body.data.subscription_plan).toBe('admin');
      expect(adminResponse.body.data.subscription_status).toBe('active');
    });
  });

  describe('Plan Limits Enforcement', () => {
    describe('Questionnaire Creation Limits', () => {
      test('free user: 1 questionnaire limit', async () => {
        // Create first questionnaire (should succeed)
        await request(app)
          .post('/api/v1/questionnaires')
          .set('Authorization', `Bearer ${freeToken}`)
          .send({
            title: 'Free User Questionnaire 1',
            description: 'Test questionnaire',
            isActive: true,
          })
          .expect(201);

        // Try to create second questionnaire (should fail)
        const response = await request(app)
          .post('/api/v1/questionnaires')
          .set('Authorization', `Bearer ${freeToken}`)
          .send({
            title: 'Free User Questionnaire 2',
            description: 'Should exceed limit',
            isActive: true,
          })
          .expect(402);

        expect(response.body.error.code).toBe('SUBSCRIPTION_ERROR_001');
      });

      test('starter user: 5 questionnaire limit', async () => {
        // Create 5 questionnaires (should all succeed)
        for (let i = 1; i <= 5; i++) {
          await request(app)
            .post('/api/v1/questionnaires')
            .set('Authorization', `Bearer ${starterToken}`)
            .send({
              title: `Starter Questionnaire ${i}`,
              description: `Test questionnaire ${i}`,
              isActive: true,
            })
            .expect(201);
        }

        // Try to create 6th questionnaire (should fail)
        const response = await request(app)
          .post('/api/v1/questionnaires')
          .set('Authorization', `Bearer ${starterToken}`)
          .send({
            title: 'Starter Questionnaire 6',
            description: 'Should exceed limit',
            isActive: true,
          })
          .expect(402);

        expect(response.body.error.code).toBe('SUBSCRIPTION_ERROR_001');
      });

      test('business user: unlimited questionnaires', async () => {
        // Create 10 questionnaires (should all succeed)
        for (let i = 1; i <= 10; i++) {
          await request(app)
            .post('/api/v1/questionnaires')
            .set('Authorization', `Bearer ${businessToken}`)
            .send({
              title: `Business Questionnaire ${i}`,
              description: `Business questionnaire ${i}`,
              isActive: true,
            })
            .expect(201);
        }

        // Check usage shows actual count with no limit
        const usageResponse = await request(app)
          .get('/api/v1/subscription/usage')
          .set('Authorization', `Bearer ${businessToken}`)
          .expect(200);

        expect(usageResponse.body.data.usage.questionnaires.used).toBe(10);
        expect(usageResponse.body.data.usage.questionnaires.limit).toBeNull();
      });

      test('admin user: unlimited questionnaires', async () => {
        // Create 5 questionnaires (should all succeed)
        for (let i = 1; i <= 5; i++) {
          await request(app)
            .post('/api/v1/questionnaires')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              title: `Admin Questionnaire ${i}`,
              description: `Admin questionnaire ${i}`,
              isActive: true,
            })
            .expect(201);
        }

        // Check usage shows actual count with no limit
        const usageResponse = await request(app)
          .get('/api/v1/subscription/usage')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(usageResponse.body.data.usage.questionnaires.used).toBe(5);
        expect(usageResponse.body.data.usage.questionnaires.limit).toBeNull();
      });
    });
  });

  describe('Export Permissions by Plan', () => {
    let questionnaireId;

    beforeAll(async () => {
      // Create a questionnaire for export testing
      const qResponse = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${businessToken}`)
        .send({
          title: 'Export Test Questionnaire',
          description: 'For testing export permissions',
          isActive: true,
        })
        .expect(201);

      questionnaireId = qResponse.body.data.id;
    });

    test('free user: no export access', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/report/${questionnaireId}`)
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUBSCRIPTION_ERROR_001');
    });

    test('starter user: CSV export only', async () => {
      // CSV export (should succeed)
      await request(app)
        .get(`/api/v1/analytics/report/${questionnaireId}`)
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${starterToken}`)
        .expect(200);

      // Excel export (should fail)
      const excelResponse = await request(app)
        .get(`/api/v1/analytics/report/${questionnaireId}`)
        .query({ format: 'excel' })
        .set('Authorization', `Bearer ${starterToken}`)
        .expect(403);

      expect(excelResponse.body.error.code).toBe('SUBSCRIPTION_ERROR_002');
    });

    test('business user: all export formats', async () => {
      // CSV export (should succeed)
      await request(app)
        .get(`/api/v1/analytics/report/${questionnaireId}`)
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      // Excel export (should succeed)
      await request(app)
        .get(`/api/v1/analytics/report/${questionnaireId}`)
        .query({ format: 'excel' })
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);
    });

    test('admin user: all export formats', async () => {
      // CSV export (should succeed)
      await request(app)
        .get(`/api/v1/analytics/report/${questionnaireId}`)
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Excel export (should succeed)
      await request(app)
        .get(`/api/v1/analytics/report/${questionnaireId}`)
        .query({ format: 'excel' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Subscription Status Changes', () => {
    test('inactive subscription should block actions', async () => {
      // Set free user to inactive
      await freeUser.update({ subscription_status: 'inactive' });

      // Try to create questionnaire (should fail)
      const response = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          title: 'Should Fail - Inactive',
          description: 'Inactive subscription test',
          isActive: true,
        })
        .expect(402);

      expect(response.body.error.code).toBe('SUBSCRIPTION_ERROR_005');

      // Reset to active for other tests
      await freeUser.update({ subscription_status: 'active' });
    });
  });

  describe('Plan Upgrade/Downgrade Functionality', () => {
    test('upgrade from free to starter should increase limits', async () => {
      // Free user creates 1 questionnaire (at limit)
      await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          title: 'Free User at Limit',
          description: 'At free plan limit',
          isActive: true,
        })
        .expect(201);

      // Upgrade to starter
      await freeUser.update({ subscription_plan: 'starter' });

      // Should now be able to create more questionnaires
      await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          title: 'Now Starter User',
          description: 'After upgrade',
          isActive: true,
        })
        .expect(201);

      // Reset back to free for other tests
      await freeUser.update({ subscription_plan: 'free' });
    });
  });

  describe('Usage Tracking Accuracy', () => {
    test('usage should be tracked correctly for all plans', async () => {
      // Check free user usage
      const freeUsage = await request(app)
        .get('/api/v1/subscription/usage')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(freeUsage.body.success).toBe(true);
      expect(freeUsage.body.data.usage.questionnaires.limit).toBe(1);
      expect(freeUsage.body.data.usage.responses.limit).toBe(50);
      expect(freeUsage.body.data.usage.exports.limit).toBe(5);

      // Check starter user usage
      const starterUsage = await request(app)
        .get('/api/v1/subscription/usage')
        .set('Authorization', `Bearer ${starterToken}`)
        .expect(200);

      expect(starterUsage.body.success).toBe(true);
      expect(starterUsage.body.data.usage.questionnaires.limit).toBe(5);
      expect(starterUsage.body.data.usage.responses.limit).toBe(500);
      expect(starterUsage.body.data.usage.exports.limit).toBe(50);

      // Check business user usage
      const businessUsage = await request(app)
        .get('/api/v1/subscription/usage')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(businessUsage.body.success).toBe(true);
      expect(businessUsage.body.data.usage.questionnaires.limit).toBeNull();
      expect(businessUsage.body.data.usage.responses.limit).toBeNull();
      expect(businessUsage.body.data.usage.exports.limit).toBeNull();

      // Check admin user usage
      const adminUsage = await request(app)
        .get('/api/v1/subscription/usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminUsage.body.success).toBe(true);
      expect(adminUsage.body.data.usage.questionnaires.limit).toBeNull();
      expect(adminUsage.body.data.usage.responses.limit).toBeNull();
      expect(adminUsage.body.data.usage.exports.limit).toBeNull();
    });
  });

  describe('Available Plans Endpoint', () => {
    test('should return all available subscription plans', async () => {
      const response = await request(app)
        .get('/api/v1/subscription/plans')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check that all expected plans are present (admin should not be publicly available)
      const planNames = response.body.data.map(plan => plan.name);
      expect(planNames).toContain('free');
      expect(planNames).toContain('starter');
      expect(planNames).toContain('business');
      expect(planNames).not.toContain('admin'); // Admin plan should not be publicly listed
    });
  });

  describe('Upgrade Suggestions', () => {
    test('should provide upgrade suggestions for free user', async () => {
      const response = await request(app)
        .get('/api/v1/subscription/upgrade-suggestions')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.upgrade_suggestions)).toBe(true);
    });

    test('should provide no suggestions for business user', async () => {
      const response = await request(app)
        .get('/api/v1/subscription/upgrade-suggestions')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.upgrade_suggestions).toEqual([]);
    });
  });
});