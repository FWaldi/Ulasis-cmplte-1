const request = require('supertest');
const app = require('../../src/app-test');
const { User, SubscriptionUsage, PaymentTransaction } = require('../../src/models');
const logger = require('../../src/utils/logger');

// Import the mock variable from setup so we can reset it
const mockQuestionnaireCreationCount = 0;
try {
  // Try to access the variable from setup.js scope
  const setupModule = require('../../tests/setup');
  // This won't work directly due to module scope, so we'll reset it via the SubscriptionUsage mock
} catch (e) {
  // Fallback - we'll reset via direct mock manipulation
}

describe('Subscription API Integration Tests', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    // Reset mock questionnaire count for each test
    if (typeof global.resetMockQuestionnaireCount === 'function') {
      global.resetMockQuestionnaireCount();
    }

    // Reset mock subscription state
    if (typeof global.resetMockSubscriptionState === 'function') {
      global.resetMockSubscriptionState();
    }

    // Create test user with unique email
    const uniqueEmail = `subscription-api-test-${Date.now()}@example.com`;
    testUser = await User.createWithPassword({
      email: uniqueEmail,
      password: 'password123',
      first_name: 'API',
      last_name: 'Test',
      subscription_plan: 'free',
      subscription_status: 'active',
      email_verified: true,
    });

    // Add small delay to ensure user is properly stored
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify user was created correctly by finding it directly
    const foundUser = await User.findByPk(testUser.id);

    // Reset subscription usage for this user to ensure clean state
    const { SubscriptionUsage } = require('../../src/models');
    await SubscriptionUsage.destroy({ where: { user_id: testUser.id } });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: uniqueEmail,
        password: 'password123',
      });

    console.log('DEBUG: Login response body:', JSON.stringify(loginResponse.body, null, 2));
    authToken = loginResponse.body.data.accessToken;
  });

  afterEach(async () => {
    if (testUser) {
      await User.destroy({ where: { id: testUser.id } });
    }
  });

  describe('GET /api/v1/subscription/current', () => {
    test('should return current subscription status', async () => {
      // First verify our test user was created correctly
      expect(testUser.id).toBeGreaterThanOrEqual(1); // User should have a valid ID
      expect(testUser.email).toContain('subscription-api-test-');
      expect(testUser.subscription_plan).toBe('free');

      // Force a fresh login to get a new token
      const freshLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        });

      const freshToken = freshLoginResponse.body.data.accessToken;

      const response = await request(app)
        .get('/api/v1/subscription/current')
        .set('Authorization', `Bearer ${freshToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe(testUser.id);
      expect(response.body.data.subscription_plan).toBe('free');
      expect(response.body.data.subscription_status).toBe('active');
    });

    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/subscription/current');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/subscription/usage', () => {
    test('should return current usage statistics', async () => {
      const response = await request(app)
        .get('/api/v1/subscription/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.usage).toBeDefined();
      expect(response.body.data.usage.questionnaires).toBeDefined();
      expect(response.body.data.usage.responses).toBeDefined();
      expect(response.body.data.usage.exports).toBeDefined();
    });
  });

  describe('GET /api/v1/subscription/plans', () => {
    test('should return available subscription plans', async () => {
      const response = await request(app)
        .get('/api/v1/subscription/plans')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check plan structure
      const freePlan = response.body.data.find(plan => plan.name === 'free');
      expect(freePlan).toBeDefined();
      expect(freePlan.limits.questionnaires).toBe(1);
      expect(freePlan.limits.responses).toBe(50);
    });
  });

  describe('POST /api/v1/subscription/upgrade-request', () => {
    test('should create upgrade request', async () => {
      const response = await request(app)
        .post('/api/v1/subscription/upgrade-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          target_plan: 'starter',
          reason: 'Need more questionnaires for my business',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.request_id).toBeDefined();
      expect(response.body.data.payment_url).toBeDefined();
      expect(response.body.data.amount).toBeDefined();
    });

    test('should validate request body', async () => {
      const response = await request(app)
        .post('/api/v1/subscription/upgrade-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Questionnaire Creation with Subscription Limits', () => {
    test('should allow questionnaire creation within limits', async () => {
      const response = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Questionnaire',
          description: 'Test Description',
          is_active: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should deny questionnaire creation exceeding limits', async () => {
      // First create one questionnaire
      await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'First Questionnaire',
          description: 'Test Description',
          is_active: true,
        });

      // Try to create second questionnaire (should fail for free plan)
      const response = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Second Questionnaire',
          description: 'Test Description',
          is_active: true,
        });

      expect(response.status).toBe(402);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUBSCRIPTION_ERROR_001');
    });
  });

  describe('Response Submission with Subscription Limits', () => {
    let questionnaireId;
    let questionId;

    beforeEach(async () => {
      // Create a questionnaire first
      const qResponse = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Questionnaire for Responses',
          description: 'Test Description',
          is_active: true,
        });

      questionnaireId = qResponse.body.data.id;

      // Create a question for the questionnaire
      const questionResponse = await request(app)
        .post(`/api/v1/questions/questionnaires/${questionnaireId}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionText: 'Test Question',
          questionType: 'text',
          category: 'test',
          isRequired: true,
          orderIndex: 1,
        });

      console.log('DEBUG: Question creation response:', JSON.stringify(questionResponse.body, null, 2));
      expect(questionResponse.status).toBe(201);
      questionId = questionResponse.body.data.id;
    });

    test('should allow responses within limits', async () => {
      console.log('DEBUG: Submitting response with questionnaireId:', questionnaireId, 'questionId:', questionId);
      const response = await request(app)
        .post('/api/v1/responses/anonymous')
        .set('Content-Type', 'application/json')
        .send({
          questionnaire_id: questionnaireId,
          answers: [{ question_id: questionId, answer_value: 'Test Answer' }],
        });

      console.log('DEBUG: Response submission response:', JSON.stringify(response.body, null, 2));
      // Accept both 201 (created) and 200 (success) as valid responses
      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);
    });

    // Note: Testing response limits would require creating 50+ responses
    // which is complex for integration tests. Unit tests cover this better.
  });
});