'use strict';

const request = require('supertest');
const { User, sequelize } = require('../../src/models');
const app = require('../../src/app-test');

describe('Subscription Request API', () => {
  let testUser, adminUser, userToken, adminToken;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.INTEGRATION_TEST = 'true'; // Skip setup.js cleanup

    // Models are already initialized by app-test.js through database-test.js
    // Just wait for database to be fully ready
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up all data before each test using direct deletion
    const models = require('../../src/models');

    // Clean in proper order to respect foreign key constraints
    await models.Answer.destroy({ where: {}, force: true });
    await models.Response.destroy({ where: {}, force: true });
    await models.Question.destroy({ where: {}, force: true });
    await models.QRCode.destroy({ where: {}, force: true });
    await models.Questionnaire.destroy({ where: {}, force: true });
    await models.SubscriptionUsage.destroy({ where: {}, force: true });
    await models.PaymentTransaction.destroy({ where: {}, force: true });
    await models.NotificationHistory.destroy({ where: {}, force: true });
    await models.AuditLog.destroy({ where: {}, force: true });
    await models.SubscriptionRequest.destroy({ where: {}, force: true });
    await models.User.destroy({ where: {}, force: true });

    // Wait a bit for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    // Create test users directly using User.createWithPassword
    testUser = await User.createWithPassword({
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
      subscription_plan: 'free',
      email_verified: true,
    });

    adminUser = await User.createWithPassword({
      email: 'admin@example.com',
      password: 'password123',
      first_name: 'Admin',
      last_name: 'User',
      subscription_plan: 'admin',
      email_verified: true,
    });

    // Login and get tokens
    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123',
      });

    userToken = userLogin.body.data.accessToken;
    adminToken = adminLogin.body.data.accessToken;
  });

  describe('POST /api/v1/subscription/upgrade-request', () => {
    it('should create a subscription request successfully', async () => {
      const response = await request(app)
        .post('/api/v1/subscription/upgrade-request')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          target_plan: 'starter',
          reason: 'I need more responses for my growing business',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.request_id).toBeDefined();
      expect(response.body.data.target_plan).toBe('starter');
      expect(response.body.data.payment_url).toBeDefined();
      expect(response.body.data.amount).toBe(9.99);
    });

    it('should reject request with invalid target plan', async () => {
      const response = await request(app)
        .post('/api/v1/subscription/upgrade-request')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          target_plan: 'invalid_plan',
          reason: 'Test request',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PLAN');
    });

    it('should reject request without target plan', async () => {
      const response = await request(app)
        .post('/api/v1/subscription/upgrade-request')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Test request',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent duplicate pending requests', async () => {
      // Create first request
      await request(app)
        .post('/api/v1/subscription/upgrade-request')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          target_plan: 'starter',
          reason: 'First request',
        });

      // Try to create second request
      const response = await request(app)
        .post('/api/v1/subscription/upgrade-request')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          target_plan: 'business',
          reason: 'Second request',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PENDING_REQUEST_EXISTS');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/subscription/upgrade-request')
        .send({
          target_plan: 'starter',
          reason: 'Test request',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/subscription/requests/pending', () => {
    beforeEach(async () => {
      // Create a subscription request
      await request(app)
        .post('/api/v1/subscription/upgrade-request')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          target_plan: 'starter',
          reason: 'Test request for admin review',
        });
    });

    it('should allow admin to view pending requests', async () => {
      const response = await request(app)
        .get('/api/v1/subscription/requests/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requests).toHaveLength(1);
      expect(response.body.data.requests[0].user_email).toBe('test@example.com');
      expect(response.body.data.requests[0].requested_plan).toBe('starter');
    });

    it('should reject non-admin users from viewing pending requests', async () => {
      const response = await request(app)
        .get('/api/v1/subscription/requests/pending')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Admin Access Required');
    });

    it('should support filtering by user_id', async () => {
      const response = await request(app)
        .get(`/api/v1/subscription/requests/pending?user_id=${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requests).toHaveLength(1);
    });

    it('should support filtering by requested_plan', async () => {
      const response = await request(app)
        .get('/api/v1/subscription/requests/pending?requested_plan=starter')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requests).toHaveLength(1);
    });
  });

  describe('GET /api/v1/subscription/requests/:requestId', () => {
    let requestId;

    beforeEach(async () => {
      // Create a subscription request
      const createResponse = await request(app)
        .post('/api/v1/subscription/upgrade-request')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          target_plan: 'starter',
          reason: 'Test request for detailed view',
        });

      requestId = createResponse.body.data.request_id;
    });

    it('should allow admin to view request details', async () => {
      const response = await request(app)
        .get(`/api/v1/subscription/requests/${requestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(requestId);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.requested_plan).toBe('starter');
      expect(response.body.data.reason).toBe('Test request for detailed view');
    });

    it('should reject non-admin users from viewing request details', async () => {
      const response = await request(app)
        .get(`/api/v1/subscription/requests/${requestId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent request', async () => {
      const response = await request(app)
        .get('/api/v1/subscription/requests/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/v1/subscription/requests/:requestId/process', () => {
    let requestId;

    beforeEach(async () => {
      // Create a subscription request
      const createResponse = await request(app)
        .post('/api/v1/subscription/upgrade-request')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          target_plan: 'starter',
          reason: 'Test request for processing',
        });

      requestId = createResponse.body.data.request_id;
    });

    it('should allow admin to approve request', async () => {
      const response = await request(app)
        .post(`/api/v1/subscription/requests/${requestId}/process`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approve',
          admin_notes: 'Request approved after verification',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('approved');
      expect(response.body.data.status).toBe('approved');
    });

    it('should allow admin to reject request', async () => {
      const response = await request(app)
        .post(`/api/v1/subscription/requests/${requestId}/process`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'reject',
          admin_notes: 'Insufficient justification for upgrade',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('rejected');
      expect(response.body.data.status).toBe('rejected');
    });

    it('should reject non-admin users from processing requests', async () => {
      const response = await request(app)
        .post(`/api/v1/subscription/requests/${requestId}/process`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          action: 'approve',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should require valid action', async () => {
      const response = await request(app)
        .post(`/api/v1/subscription/requests/${requestId}/process`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'invalid_action',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent processing already processed requests', async () => {
      // Approve the request first
      await request(app)
        .post(`/api/v1/subscription/requests/${requestId}/process`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approve',
        });

      // Try to process again
      const response = await request(app)
        .post(`/api/v1/subscription/requests/${requestId}/process`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'reject',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });

    it('should update user subscription when approved', async () => {
      // Approve the request
      const approveResponse = await request(app)
        .post(`/api/v1/subscription/requests/${requestId}/process`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approve',
        });

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body.success).toBe(true);

      // Wait a moment for database to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check user's current subscription
      const subscriptionResponse = await request(app)
        .get('/api/v1/subscription/current')
        .set('Authorization', `Bearer ${userToken}`);

      expect(subscriptionResponse.status).toBe(200);
      expect(subscriptionResponse.body.data.subscription_plan).toBe('starter');
    });
  });

  describe('Environment-specific behavior', () => {
    it('should create manual payment method in development', async () => {
      // Set NODE_ENV to development for this test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .post('/api/v1/subscription/upgrade-request')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          target_plan: 'starter',
          reason: 'Development test',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payment_required).toBe(false);

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });
  });
});