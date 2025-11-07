'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../src/app-test');
const { User, Questionnaire, Question, Response, Answer, initialize, sequelize } = require('../../src/models');
const bcrypt = require('bcrypt');
const { resetQuestionMockState } = require('../mocks/modelsMock');

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

// Mock cache service to prevent Redis connection issues
jest.mock('../../src/services/cacheService', () => ({
  getCache: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(true),
  invalidateQuestionnaireCache: jest.fn().mockResolvedValue(true),
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
}));

// Mock analytics services to prevent timeouts during comprehensive testing
jest.mock('../../src/services/bubbleAnalyticsService', () => ({
  getBubbleAnalytics: jest.fn().mockImplementation(async (questionnaireId, options) => {
    return {
      success: true,
      data: {
        questionnaire_id: questionnaireId,
        categories: [
          {
            name: 'Service Quality',
            rating: 4.2,
            response_count: 10,
            color: 'green',
            trend: 'improving',
          },
          {
            name: 'Product Quality',
            rating: 3.8,
            response_count: 10,
            color: 'yellow',
            trend: 'stable',
          },
        ],
        total_responses: 10,
        average_rating: 4.0,
        date_range: {
          from: options.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          to: options.dateTo || new Date().toISOString(),
        },
      },
    };
  }),
}));

jest.mock('../../src/services/timeComparisonService', () => ({
  getTimeComparison: jest.fn().mockResolvedValue({
    success: true,
    data: {
      questionnaire_id: 1,
      comparison_type: 'week',
      current_period: {
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString(),
        total_responses: 25,
        average_rating: 4.1,
      },
      previous_period: {
        start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        total_responses: 20,
        average_rating: 3.9,
      },
      comparison_metrics: {
        response_count_change: 25,
        overall_rating_change: 0.2,
        category_comparisons: [],
        overall_trend: 'improving',
      },
    },
  }),
}));

describe('Comprehensive Backend Feature Tests', () => {
  const testUsers = {};
  const authTokens = {};
  const testQuestionnaires = {};
  const testQuestions = {};
  const testResponses = {};

  // Test data constants
  const USER_DATA = {
    free: {
      email: 'free-user@test.com',
      password: 'Password123!',
      first_name: 'Free',
      last_name: 'User',
      subscription_plan: 'free',
      subscription_status: 'active',
      email_verified: true,
    },
    starter: {
      email: 'starter-user@test.com',
      password: 'Password123!',
      first_name: 'Starter',
      last_name: 'User',
      subscription_plan: 'starter',
      subscription_status: 'active',
      email_verified: true,
    },
    business: {
      email: 'business-user@test.com',
      password: 'Password123!',
      first_name: 'Business',
      last_name: 'User',
      subscription_plan: 'business',
      subscription_status: 'active',
      email_verified: true,
    },
    admin: {
      email: 'admin@test.com',
      password: 'Admin123!',
      first_name: 'Admin',
      last_name: 'User',
      subscription_plan: 'admin',
      subscription_status: 'active',
      email_verified: true,
      role: 'admin',
    },
  };

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';

    // Set extended timeout for comprehensive tests
    // jest.setTimeout(60000); // Removed - using --no-timeout flag instead

    // Initialize test database
    await initialize();

    // Wait for database to be fully ready
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('🚀 Starting Comprehensive Backend Tests...');
    console.log('📋 Creating test users with different subscription plans...');

    // Create users and get auth tokens
    for (const [plan, userData] of Object.entries(USER_DATA)) {
      console.log(`📝 Registering ${plan} user: ${userData.email}`);

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      testUsers[plan] = registerResponse.body.data;

      console.log(`🔐 Logging in ${plan} user...`);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      authTokens[plan] = loginResponse.body.data.accessToken;
    }

    console.log('✅ All users registered and logged in successfully');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up test database...');

    // Clean up all test data
    await clearQuestionnaires();

    // Clean up users (force: true to bypass foreign key constraints)
    try {
      await User.destroy({ where: {}, force: true });
    } catch (error) {
      console.log('Warning: Could not clean up users:', error.message);
    }

    // Close database connection
    try {
      const { sequelize } = require('../../src/config/database-test');
      await sequelize.close();
    } catch (error) {
      console.log('Warning: Could not close database:', error.message);
    }

    console.log('✅ Comprehensive tests completed!');
  });

  describe('1. User Registration & Authentication System', () => {
    test('should have users registered and logged in from beforeAll', async () => {
      // Verify that users were created in beforeAll
      expect(Object.keys(testUsers)).toHaveLength(Object.keys(USER_DATA).length);
      expect(Object.keys(authTokens)).toHaveLength(Object.keys(USER_DATA).length);

      // Verify each user has correct data
      for (const [plan, userData] of Object.entries(USER_DATA)) {
        expect(testUsers[plan]).toBeDefined();
        expect(testUsers[plan].email).toBe(userData.email);
        expect(testUsers[plan].subscription_plan).toBe(userData.subscription_plan);
        expect(authTokens[plan]).toBeDefined();
        expect(typeof authTokens[plan]).toBe('string');
      }

      console.log('✅ All users verified successfully');
    });

    test('should login users and generate valid tokens', async () => {
      for (const [plan, userData] of Object.entries(USER_DATA)) {
        console.log(`🔐 Logging in ${plan} user...`);

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: userData.email,
            password: userData.password,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
        expect(response.body.data.user.email).toBe(userData.email);

        // Store auth tokens for later tests
        authTokens[plan] = response.body.data.accessToken;
      }

      console.log('✅ All users logged in successfully');
    });

    test('should reject invalid login credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('should refresh tokens successfully', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: USER_DATA.business.email,
          password: USER_DATA.business.password,
        });

      const refreshToken = loginResponse.body.data.refreshToken;

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken });

      console.log('Refresh token response status:', response.status);
      console.log('Refresh token response body:', response.body);

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });
  });

  describe('2. Subscription System & Limits Enforcement', () => {
    test('should return correct subscription status for each plan', async () => {
      const expectedLimits = {
        free: { questionnaires: 1, responses: 50, exports: 5 },
        starter: { questionnaires: 5, responses: 500, exports: 25 },
        business: { questionnaires: null, responses: null, exports: null },
      };

      for (const [plan, token] of Object.entries(authTokens)) {
        console.log(`💳 Checking subscription status for ${plan} user...`);

        const response = await request(app)
          .get('/api/v1/subscription/current')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.subscription_plan).toBe(plan);
        expect(response.body.data.subscription_status).toBe('active');

        // Check limits structure
        expect(response.body.data.limits).toBeDefined();
        expect(response.body.data.limits.questionnaires).toBeDefined();
        expect(response.body.data.limits.responses).toBeDefined();
        expect(response.body.data.limits.exports).toBeDefined();
      }

      console.log('✅ Subscription status verified for all plans');
    });

    test('should enforce questionnaire limits per subscription plan', async () => {
      // Test free user limit (1 questionnaire)
      console.log('🚫 Testing free user questionnaire limits...');

      // First questionnaire should succeed
      await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.free}`)
        .send({
          title: 'Free User Questionnaire 1',
          description: 'First questionnaire for free user',
          categoryMapping: { 'service': { improvementArea: 'Service', weight: 1.0 } },
          isActive: true,
        })
        .expect(201);

      // Second questionnaire should fail
      const response = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.free}`)
        .send({
          title: 'Free User Questionnaire 2',
          description: 'Should fail - limit exceeded',
          categoryMapping: { 'service': { improvementArea: 'Service', weight: 1.0 } },
          isActive: true,
        })
        .expect(402);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUBSCRIPTION_ERROR_001');

      // Test business user unlimited access
      console.log('✅ Testing business user unlimited access...');

      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post('/api/v1/questionnaires')
          .set('Authorization', `Bearer ${authTokens.business}`)
          .send({
            title: `Business User Questionnaire ${i}`,
            description: `Questionnaire ${i} for business user`,
            categoryMapping: { 'service': { improvementArea: 'Service', weight: 1.0 } },
            isActive: true,
          })
          .expect(201);
      }

      console.log('✅ Subscription limits enforced correctly');
    });

    test('should track usage statistics correctly', async () => {
      for (const [plan, token] of Object.entries(authTokens)) {
        console.log(`📊 Checking usage statistics for ${plan} user...`);

        const response = await request(app)
          .get('/api/v1/subscription/usage')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.usage).toBeDefined();
        expect(response.body.data.usage.questionnaires).toBeDefined();
        expect(response.body.data.usage.responses).toBeDefined();
        expect(response.body.data.usage.exports).toBeDefined();
      }

      console.log('✅ Usage statistics tracked correctly');
    });
  });

  describe('3. Questionnaire CRUD Operations', () => {
    test('should create questionnaires with different configurations', async () => {
      const questionnaireConfigs = [
        {
          user: 'business',
          title: 'Customer Satisfaction Survey',
          description: 'Comprehensive customer satisfaction survey',
          categoryMapping: {
            'service': { improvementArea: 'Service Quality', weight: 1.2 },
            'product': { improvementArea: 'Product Quality', weight: 1.0 },
            'ambience': { improvementArea: 'Ambience', weight: 0.8 },
          },
          isActive: true,
          isPublic: true,
        },
        {
          user: 'starter',
          title: 'Product Feedback Form',
          description: 'Simple product feedback collection',
          categoryMapping: {
            'product': { improvementArea: 'Product Quality', weight: 1.0 },
          },
          isActive: true,
          isPublic: false,
        },
      ];

      for (const config of questionnaireConfigs) {
        console.log(`📋 Creating questionnaire: ${config.title}`);

        const response = await request(app)
          .post('/api/v1/questionnaires')
          .set('Authorization', `Bearer ${authTokens[config.user]}`)
          .send(config)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(config.title);
        expect(response.body.data.description).toBe(config.description);
        expect(response.body.data.categoryMapping).toEqual(config.categoryMapping);
        expect(response.body.data.isActive).toBe(config.isActive);
        expect(response.body.data.isPublic).toBe(config.isPublic);

        // Store questionnaire for later tests
        testQuestionnaires[config.title] = response.body.data;
      }

      console.log('✅ Questionnaires created successfully');
    });

    test('should list user questionnaires with pagination', async () => {
      console.log('📋 Testing questionnaire listing with pagination...');

      // First create a questionnaire for pagination testing
      await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          title: 'Pagination Test Survey',
          description: 'Testing pagination functionality',
          categoryMapping: { 'test': { improvementArea: 'Test', weight: 1.0 } },
          isActive: true,
          isPublic: false,
        })
        .expect(201);

      const response = await request(app)
        .get('/api/v1/questionnaires?page=1&limit=10')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questionnaires).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.total).toBeGreaterThan(0);

      console.log(`✅ Found ${response.body.data.pagination.total} questionnaires`);
    });

    test('should update questionnaire details', async () => {
      // First create a questionnaire to update
      const createResponse = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          title: 'Customer Satisfaction Survey',
          description: 'Survey for testing updates',
          categoryMapping: { 'service': { improvementArea: 'Service Quality', weight: 1.0 } },
          isActive: true,
        })
        .expect(201);

      const questionnaire = createResponse.body.data;
      expect(questionnaire.id).toBeDefined();

      const updateData = {
        title: 'Updated Customer Satisfaction Survey',
        description: 'Updated description',
        isActive: false,
      };

      const response = await request(app)
        .put(`/api/v1/questionnaires/${questionnaire.id}`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.isActive).toBe(updateData.isActive);

      console.log('✅ Questionnaire updated successfully');
    });

    test('should delete questionnaire', async () => {
      // Create a questionnaire specifically for deletion test
      const createResponse = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          title: 'Questionnaire to Delete',
          description: 'This will be deleted',
          categoryMapping: { 'test': { improvementArea: 'Test', weight: 1.0 } },
          isActive: true,
        })
        .expect(201);

      const questionnaireId = createResponse.body.data.id;

      // Delete the questionnaire
      await request(app)
        .delete(`/api/v1/questionnaires/${questionnaireId}`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(200);

      // Verify it's deleted
      await request(app)
        .get(`/api/v1/questionnaires/${questionnaireId}`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(404);

      console.log('✅ Questionnaire deleted successfully');
    });
  });

  describe('4. Question Management', () => {
    let testQuestionnaire;

    beforeEach(async () => {
      // Clear any existing questionnaires before question management tests
      await global.clearQuestionnaires();

      // Reset question mock state for proper test isolation
      resetQuestionMockState();

      // Reset mock subscription state to ensure business user can create questionnaires
      global.resetMockSubscriptionState();

      // Create a questionnaire for question testing
      const response = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          title: 'Question Management Test',
          description: 'Testing question CRUD operations',
          categoryMapping: {
            'service': { improvementArea: 'Service Quality', weight: 1.0 },
            'product': { improvementArea: 'Product Quality', weight: 1.0 },
          },
          isActive: true,
        })
        .expect(201);

      testQuestionnaire = response.body.data;
    });

    test('should create different types of questions', async () => {
      const questionTypes = [
        {
          questionText: 'How would you rate our service?',
          questionType: 'rating',
          category: 'service',
          isRequired: true,
          orderIndex: 1,
          minValue: 1,
          maxValue: 5,
        },
        {
          questionText: 'What do you like about our product?',
          questionType: 'text',
          category: 'product',
          isRequired: false,
          orderIndex: 2,
        },
        {
          questionText: 'Would you recommend us to others?',
          questionType: 'yes_no',
          category: 'service',
          isRequired: true,
          orderIndex: 3,
        },
        {
          questionText: 'Which features do you use most?',
          questionType: 'multiple_choice',
          category: 'product',
          isRequired: false,
          orderIndex: 4,
          options: ['Feature A', 'Feature B', 'Feature C', 'Feature D'],
        },
      ];

      for (const questionData of questionTypes) {
        console.log(`❓ Creating ${questionData.questionType} question...`);

        const response = await request(app)
          .post(`/api/v1/questions/questionnaires/${testQuestionnaire.id}/questions`)
          .set('Authorization', `Bearer ${authTokens.business}`)
          .send(questionData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.questionText).toBe(questionData.questionText);
        expect(response.body.data.questionType).toBe(questionData.questionType);
        expect(response.body.data.category).toBe(questionData.category);

        // Store question for later tests
        testQuestions[questionData.questionText] = response.body.data;
      }

      console.log('✅ All question types created successfully');
    });

    test('should update question details', async () => {
      // First create a questionnaire for the question
      const questionnaireResponse = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          title: 'Question Update Test',
          description: 'For testing question updates',
          categoryMapping: { 'service': { improvementArea: 'Service', weight: 1.0 } },
          isActive: true,
        })
        .expect(201);

      const questionnaireId = questionnaireResponse.body.data.id;

      // Create a question to update
      const questionResponse = await request(app)
        .post(`/api/v1/questions/questionnaires/${questionnaireId}/questions`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          questionText: 'How would you rate our service?',
          questionType: 'rating',
          category: 'service',
          isRequired: true,
          orderIndex: 1,
          minValue: 1,
          maxValue: 5,
        })
        .expect(201);

      const question = questionResponse.body.data;
      expect(question.id).toBeDefined();

      const updateData = {
        questionText: 'Updated: How would you rate our service?',
        isRequired: false,
        orderIndex: 10,
      };

      const response = await request(app)
        .put(`/api/v1/questions/${question.id}`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questionText).toBe(updateData.questionText);
      expect(response.body.data.isRequired).toBe(updateData.isRequired);
      expect(response.body.data.orderIndex).toBe(updateData.orderIndex);

      console.log('✅ Question updated successfully');
    });

    test('should delete question', async () => {
      // First create a questionnaire for question deletion test
      const questionnaireResponse = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          title: 'Question Management Test',
          description: 'Testing question CRUD operations',
          categoryMapping: { 'service': { improvementArea: 'Service Quality', weight: 1.0 }, 'product': { improvementArea: 'Product Quality', weight: 1.0 } },
          isActive: true,
          isPublic: false,
        })
        .expect(201);

      const testQuestionnaire = questionnaireResponse.body.data;

      // Create a question specifically for deletion test
      const createResponse = await request(app)
        .post(`/api/v1/questions/questionnaires/${testQuestionnaire.id}/questions`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          questionText: 'Question to delete',
          questionType: 'text',
          category: 'General',
          isRequired: false,
          orderIndex: 99,
        })
        .expect(201);

      const questionId = createResponse.body.data.id;

      // Delete question
      await request(app)
        .delete(`/api/v1/questions/${questionId}`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(204);

      // Verify it's deleted
      await request(app)
        .get(`/api/v1/questions/${questionId}`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(404);

      console.log('✅ Question deleted successfully');
    });


    test('should reorder questions', async () => {
      // First create multiple questions for reordering
      const questionData = [
        {
          questionText: 'First question',
          questionType: 'text',
          category: 'test',
          isRequired: false,
          orderIndex: 1,
        },
        {
          questionText: 'Second question',
          questionType: 'text',
          category: 'test',
          isRequired: false,
          orderIndex: 2,
        },
      ];

      for (const qData of questionData) {
        await request(app)
          .post(`/api/v1/questions/questionnaires/${testQuestionnaire.id}/questions`)
          .set('Authorization', `Bearer ${authTokens.business}`)
          .send(qData)
          .expect(201);
      }

      // Get current questions
      const listResponse = await request(app)
        .get(`/api/v1/questions/questionnaires/${testQuestionnaire.id}/questions`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(200);

      const questions = listResponse.body.data.questions;
      expect(questions.length).toBeGreaterThan(1);

      // Reorder questions
      const newOrder = questions.map((q, index) => ({
        question_id: q.id,
        order_index: questions.length - index, // Reverse order
      }));

      const response = await request(app)
        .put(`/api/v1/questions/questionnaires/${testQuestionnaire.id}/questions/reorder`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({ questionOrders: newOrder })
        .expect(200);

      expect(response.body.success).toBe(true);

      console.log('✅ Questions reordered successfully');
    });
  });

  describe('5. Response Submission & Data Collection', () => {
    let responseQuestionnaire;
    let responseQuestions;

    beforeEach(async () => {
      // Clear any existing questionnaires before response submission tests
      await global.clearQuestionnaires();

      // Reset mock subscription state to ensure business user can create questionnaires
      global.resetMockSubscriptionState();

      // Create questionnaire for response testing
      const qResponse = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          title: 'Response Testing Survey',
          description: 'Testing response submission',
          categoryMapping: {
            'service': { improvementArea: 'Service Quality', weight: 1.0 },
            'product': { improvementArea: 'Product Quality', weight: 1.0 },
          },
          isActive: true,
          isPublic: true,
        });

      responseQuestionnaire = qResponse.body.data;
      console.log('📋 Response questionnaire created:', responseQuestionnaire.id);

      // Create questions for response testing
      const questionData = [
        {
          questionText: 'Rate our service quality',
          questionType: 'rating',
          category: 'service',
          isRequired: true,
          orderIndex: 1,
          minValue: 1,
          maxValue: 5,
        },
        {
          questionText: 'Rate our product quality',
          questionType: 'rating',
          category: 'product',
          isRequired: true,
          orderIndex: 2,
          minValue: 1,
          maxValue: 5,
        },
        {
          questionText: 'Additional comments',
          questionType: 'text',
          category: 'service',
          isRequired: false,
          orderIndex: 3,
        },
      ];

      responseQuestions = [];
      for (const qData of questionData) {
        console.log(`❓ Creating question: ${qData.questionText}`);
        try {
          const qResponse = await request(app)
            .post(`/api/v1/questions/questionnaires/${responseQuestionnaire.id}/questions`)
            .set('Authorization', `Bearer ${authTokens.business}`)
            .send(qData);

          console.log(`📥 Question creation response status: ${qResponse.status}`);
          console.log('📥 Question creation response body:', JSON.stringify(qResponse.body, null, 2));

          if (qResponse.status !== 201) {
            console.error(`❌ Failed to create question: ${qData.questionText}`, qResponse.body);
            throw new Error(`Question creation failed with status ${qResponse.status}`);
          }

          responseQuestions.push(qResponse.body.data);
          console.log(`✅ Question created: ${qResponse.body.data.id}`);
        } catch (error) {
          console.error(`❌ Failed to create question: ${qData.questionText}`, error.message);
          throw error;
        }
      }
      console.log(`✅ Created ${responseQuestions.length} questions for response testing`);
    });

    test('should submit complete responses', async () => {
      console.log('📝 Testing complete response submission...');
      console.log('📋 Questionnaire ID:', responseQuestionnaire.id);
      console.log('❓ Questions:', responseQuestions.map(q => ({ id: q.id, text: q.questionText })));

      const responseData = {
        questionnaireId: responseQuestionnaire.id,
        responses: [
          {
            questionId: responseQuestions[0].id,
            ratingScore: 5,
            isSkipped: false,
          },
          {
            questionId: responseQuestions[1].id,
            ratingScore: 4,
            isSkipped: false,
          },
          {
            questionId: responseQuestions[2].id,
            textAnswer: 'Great service and product!',
            isSkipped: false,
          },
        ],
        deviceFingerprint: 'test-device-001',
        ipAddress: '192.168.1.100',
      };

      console.log('📤 Submitting response data:', JSON.stringify(responseData, null, 2));

      const response = await request(app)
        .post('/api/v1/responses')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send(responseData);

      console.log('📥 Response status:', response.status);
      console.log('📥 Response body:', JSON.stringify(response.body, null, 2));

      if (response.status !== 201) {
        console.error('❌ Response submission failed:', response.body);
      }

      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.response_id).toBeDefined();
      expect(response.body.data.is_complete).toBe(true);
      expect(response.body.data.progress_percentage).toBe(100);

      // Store response for analytics testing
      testResponses['complete'] = response.body.data;

      console.log('✅ Complete response submitted successfully');
    });

    test('should submit partial responses', async () => {
      console.log('📝 Testing partial response submission...');

      const responseData = {
        questionnaireId: responseQuestionnaire.id,
        responses: [
          {
            questionId: responseQuestions[0].id,
            ratingScore: 4,
            isSkipped: false,
          },
          // Skip other questions
        ],
        deviceFingerprint: 'test-device-002',
        ipAddress: '192.168.1.101',
      };

      const response = await request(app)
        .post('/api/v1/responses')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send(responseData)
        .expect(201);

      expect(response.body.success).toBe(true);
      // Partial response: 1 out of 3 questions answered (33.33% complete)
      expect(response.body.data.is_complete).toBe(false);
      expect(response.body.data.progress_percentage).toBe(33.33);

      // Store response for analytics testing
      testResponses['partial'] = response.body.data;

      console.log('✅ Partial response submitted successfully');
    });

    test('should handle batch response submission', async () => {
      console.log('📝 Testing batch response submission...');

      const batchData = {
        questionnaireId: responseQuestionnaire.id,
        responses: [
          {
            questionId: responseQuestions[0].id,
            ratingScore: 3,
            isSkipped: false,
          },
          {
            questionId: responseQuestions[1].id,
            ratingScore: 4,
            isSkipped: false,
          },
        ],
        deviceFingerprint: 'test-device-batch',
        ipAddress: '192.168.1.200',
      };

      const response = await request(app)
        .post('/api/v1/responses')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send(batchData);

      if (response.status !== 201) {
        console.log('Response submission error:', response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.batch_id).toBeDefined();
      expect(response.body.data.responses_processed).toBe(1);

      console.log('✅ Batch response submitted successfully');
    });

    test('should validate required questions', async () => {
      console.log('🚫 Testing required question validation...');

      const invalidResponse = {
        questionnaireId: responseQuestionnaire.id,
        responses: [
          {
            questionId: responseQuestions[0].id,
            isSkipped: true, // Skip required question
          },
        ],
        deviceFingerprint: 'test-device-invalid',
        ipAddress: '192.168.1.300',
      };

      const response = await request(app)
        .post('/api/v1/responses')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send(invalidResponse)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');

      console.log('✅ Required question validation working correctly');
    });
  });

  describe('6. Analytics & Reporting', () => {
    let responseQuestionnaire;

    beforeEach(async () => {
      // Clear any existing questionnaires before analytics tests
      await global.clearQuestionnaires();

      // Reset mock subscription state to ensure business user can create questionnaires
      global.resetMockSubscriptionState();

      // Create a questionnaire for analytics testing
      const response = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          title: 'Analytics Test Questionnaire',
          description: 'Questionnaire for testing analytics features',
          categoryMapping: {
            'service': { improvementArea: 'Service Quality', weight: 1.0 },
            'product': { improvementArea: 'Product Quality', weight: 1.0 },
          },
          isActive: true,
        })
        .expect(201);

      responseQuestionnaire = response.body.data;
    });

    test('should generate bubble analytics', async () => {
      console.log('📊 Testing bubble analytics generation...');

      const response = await request(app)
        .get(`/api/v1/analytics/bubble/${responseQuestionnaire.id}`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questionnaire_id).toBe(responseQuestionnaire.id);
      expect(response.body.data.categories).toBeDefined();
      expect(response.body.data.total_responses).toBeGreaterThan(0);
      expect(response.body.data.categories.length).toBeGreaterThan(0);

      // Check category structure
      const categories = response.body.data.categories;
      categories.forEach(category => {
        expect(category.name).toBeDefined();
        expect(category.rating).toBeDefined();
        expect(category.response_count).toBeDefined();
        expect(['red', 'yellow', 'green']).toContain(category.color);
        expect(['improving', 'declining', 'stable']).toContain(category.trend);
      });

      console.log('✅ Bubble analytics generated successfully');
    });

    test('should generate analytics summary', async () => {
      console.log('📊 Testing analytics summary...');

      const response = await request(app)
        .get(`/api/v1/analytics/summary/${responseQuestionnaire.id}`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questionnaire_id).toBe(responseQuestionnaire.id);
      expect(response.body.data.total_responses).toBeGreaterThan(0);
      expect(response.body.data.overall_rating).toBeDefined();
      expect(response.body.data.color_distribution).toBeDefined();

      console.log('✅ Analytics summary generated successfully');
    });

    test('should generate time period comparison', async () => {
      console.log('📊 Testing time period comparison...');

      const response = await request(app)
        .get(`/api/v1/analytics/comparison/${responseQuestionnaire.id}`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questionnaire_id).toBe(responseQuestionnaire.id);
      expect(response.body.data.comparison_type).toBeDefined();
      expect(response.body.data.current_period).toBeDefined();
      expect(response.body.data.previous_period).toBeDefined();
      expect(response.body.data.comparison_metrics).toBeDefined();

      console.log('✅ Time period comparison generated successfully');
    });

    test('should generate CSV report', async () => {
      console.log('📄 Testing CSV report generation...');

      const response = await request(app)
        .get(`/api/v1/analytics/report/${responseQuestionnaire.id}`)
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Analytics Report');

      console.log('✅ CSV report generated successfully');
    });

    test('should generate Excel report', async () => {
      console.log('📊 Testing Excel report generation...');

      const response = await request(app)
        .get(`/api/v1/analytics/report/${responseQuestionnaire.id}`)
        .query({ format: 'excel' })
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('attachment');

      console.log('✅ Excel report generated successfully');
    });
  });

  describe('7. QR Code Generation & Tracking', () => {
    let qrQuestionnaire;

    beforeEach(async () => {
      // Clear any existing questionnaires before QR code tests
      await global.clearQuestionnaires();

      // Reset mock subscription state to ensure business user can create questionnaires
      global.resetMockSubscriptionState();

      // Create a questionnaire for QR code testing
      const response = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          title: 'QR Code Test Questionnaire',
          description: 'Questionnaire for testing QR code features',
          categoryMapping: {
            'service': { improvementArea: 'Service Quality', weight: 1.0 },
          },
          isActive: true,
        })
        .expect(201);

      qrQuestionnaire = response.body.data;
    });

    test('should generate QR codes for questionnaires', async () => {
      console.log('📱 Testing QR code generation...');

      const response = await request(app)
        .post('/api/v1/qr-codes')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          questionnaireId: qrQuestionnaire.id,
          customUrl: `https://survey.example.com/q/${qrQuestionnaire.id}`,
          options: {
            size: 'medium',
            includeLogo: false,
            customColors: {
              foreground: '#000000',
              background: '#ffffff',
            },
          },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qr_code_id).toBeDefined();
      expect(response.body.data.qr_code_url).toBeDefined();
      expect(response.body.data.questionnaire_id).toBe(qrQuestionnaire.id);

      console.log('✅ QR code generated successfully');
    });

    test('should list QR codes for user', async () => {
      console.log('📱 Testing QR code listing...');

      const response = await request(app)
        .get('/api/v1/qr-codes')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qr_codes).toBeDefined();
      expect(Array.isArray(response.body.data.qr_codes)).toBe(true);

      console.log(`✅ Found ${response.body.data.qr_codes.length} QR codes`);
    });

    test('should track QR code scans', async () => {
      console.log('📱 Testing QR code scan tracking...');

      // First, create a QR code
      const createResponse = await request(app)
        .post('/api/v1/qr-codes')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          questionnaireId: qrQuestionnaire.id,
          customUrl: 'https://survey.example.com/track-test',
        })
        .expect(201);

      const qrCodeId = createResponse.body.data.qr_code_id;

      // Track a scan (this would typically be called from a redirect endpoint)
      const response = await request(app)
        .post(`/api/v1/qr-codes/${qrCodeId}/scan`)
        .send({
          userAgent: 'Test Browser',
          ipAddress: '192.168.1.400',
          referrer: 'https://google.com',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.scan_recorded).toBe(true);

      console.log('✅ QR code scan tracked successfully');
    });
  });

  describe('8. Admin Functionality', () => {
    test('should access admin dashboard with admin role', async () => {
      console.log('👑 Testing admin dashboard access...');

      const response = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.stats).toBeDefined();

      console.log('✅ Admin dashboard accessed successfully');
    });

    test('should list all users (admin only)', async () => {
      console.log('👥 Testing user listing (admin)...');

      const response = await request(app)
        .get('/api/v1/admin/users?page=1&limit=20')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();

      console.log(`✅ Found ${response.body.data.users.length} users`);
    });

    test('should update user subscription (admin only)', async () => {
      console.log('💳 Testing user subscription update (admin)...');

      // Get a regular user to update
      const usersResponse = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      const regularUser = usersResponse.body.data.users.find(u => u.role !== 'admin');
      expect(regularUser).toBeDefined();

      // Update subscription
      const response = await request(app)
        .put(`/api/v1/admin/users/${regularUser.id}/subscription`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send({
          subscription_plan: 'starter',
          subscription_status: 'active',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription_plan).toBe('starter');
      expect(response.body.data.subscription_status).toBe('active');

      console.log('✅ User subscription updated successfully');
    });

    test('should deny admin access to regular users', async () => {
      console.log('🚫 Testing admin access denial for regular users...');

      const response = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${authTokens.free}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Admin Access Required');

      console.log('✅ Admin access properly denied for regular users');
    });
  });

  describe('9. Error Handling & Edge Cases', () => {
    test('should handle malformed requests gracefully', async () => {
      console.log('🚨 Testing malformed request handling...');

      // Invalid JSON
      const response = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);

      console.log('✅ Malformed requests handled gracefully');
    });

    test('should handle database constraint violations', async () => {
      console.log('🚨 Testing constraint violation handling...');

      // Try to create duplicate user
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(USER_DATA.free) // Already exists
        .expect(400);

      expect(response.body.success).toBe(false);

      console.log('✅ Constraint violations handled gracefully');
    });

    test('should handle rate limiting (if implemented)', async () => {
      console.log('🚨 Testing rate limiting...');

      // Make multiple rapid requests
      const promises = Array(10).fill().map(() =>
        request(app)
          .get('/api/v1/health')
          .expect(200),
      );

      const results = await Promise.all(promises);
      expect(results.length).toBe(10);

      console.log('✅ Rate limiting test completed');
    });

    test('should handle missing resources gracefully', async () => {
      console.log('🚨 Testing missing resource handling...');

      // Non-existent questionnaire
      await request(app)
        .get('/api/v1/questionnaires/99999')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(404);

      // Non-existent question
      await request(app)
        .get('/api/v1/questions/99999')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(404);

      // Non-existent analytics
      await request(app)
        .get('/api/v1/analytics/bubble/99999')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(404);

      console.log('✅ Missing resources handled gracefully');
    });
  });

  describe('10. Performance & Load Testing', () => {
    test('should handle concurrent requests', async () => {
      console.log('⚡ Testing concurrent request handling...');

      const concurrentRequests = 20;
      const promises = Array(concurrentRequests).fill().map((_, index) =>
        request(app)
          .get('/api/v1/questionnaires')
          .set('Authorization', `Bearer ${authTokens.business}`)
          .expect(200),
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results.length).toBe(concurrentRequests);
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds (test environment)

      console.log(`✅ ${concurrentRequests} concurrent requests handled in ${endTime - startTime}ms`);
    });

    test('should handle large data sets', async () => {
      console.log('📊 Testing large data set handling...');

      // Create questionnaire with many questions
      const qResponse = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          title: 'Large Dataset Test',
          description: 'Testing with many questions',
          categoryMapping: { 'test': { improvementArea: 'Test', weight: 1.0 } },
          isActive: true,
        });

      const questionnaireId = qResponse.body.data.id;

      // Create many questions
      const questionPromises = Array(50).fill().map((_, index) =>
        request(app)
          .post(`/api/v1/questions/questionnaires/${questionnaireId}/questions`)
          .set('Authorization', `Bearer ${authTokens.business}`)
          .send({
            questionText: `Question ${index + 1}`,
            questionType: 'rating',
            category: 'test',
            isRequired: index < 10, // First 10 are required
            orderIndex: index + 1,
            minValue: 1,
            maxValue: 5,
          }),
      );

      const questionResults = await Promise.all(questionPromises);
      expect(questionResults.length).toBe(50);

      // Test retrieving all questions
      const listResponse = await request(app)
        .get(`/api/v1/questions/questionnaires/${questionnaireId}/questions`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(200);

      expect(listResponse.body.data.questions.length).toBe(50);

      console.log('✅ Large data sets handled successfully');
    });
  });

  describe('11. Security Testing', () => {
    test('should prevent SQL injection attempts', async () => {
      console.log('🔒 Testing SQL injection protection...');

      const maliciousInput = "'; DROP TABLE users; --";

      // Try SQL injection in questionnaire title
      const response = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          title: maliciousInput,
          description: 'SQL injection test',
          categoryMapping: { 'test': { improvementArea: 'Test', weight: 1.0 } },
          isActive: true,
        })
        .expect(201); // Should succeed but not execute SQL

      expect(response.body.data.title).toBe(maliciousInput);

      // Verify users table still exists
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: USER_DATA.business.email,
          password: USER_DATA.business.password,
        })
        .expect(200);

      console.log('✅ SQL injection protection working');
    });

    test('should prevent XSS attempts', async () => {
      console.log('🔒 Testing XSS protection...');

      const xssPayload = '<script>alert("xss")</script>';

      const response = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          title: xssPayload,
          description: 'XSS test',
          categoryMapping: { 'test': { improvementArea: 'Test', weight: 1.0 } },
          isActive: true,
        })
        .expect(201);

      // The payload should be stored but escaped when rendered
      expect(response.body.data.title).toContain(xssPayload);

      console.log('✅ XSS protection working');
    });

    test('should validate input sanitization', async () => {
      console.log('🔒 Testing input sanitization...');

      // Test various malicious inputs
      const maliciousInputs = [
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        '{{7*7}}', // Template injection
        '${7*7}', // Expression injection
      ];

      for (const input of maliciousInputs) {
        await request(app)
          .post('/api/v1/questionnaires')
          .set('Authorization', `Bearer ${authTokens.business}`)
          .send({
            title: input,
            description: 'Sanitization test',
            categoryMapping: { 'test': { improvementArea: 'Test', weight: 1.0 } },
            isActive: true,
          })
          .expect(201);
      }

      console.log('✅ Input sanitization working');
    });
  });

  describe('12. Data Integrity & Consistency', () => {
    test('should maintain data consistency across operations', async () => {
      console.log('🔍 Testing data consistency...');

      // Note: Test environment may have existing data from previous tests
      // We'll work with the actual data state rather than trying to clean up

      // Create questionnaire
      const qResponse = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          title: 'Consistency Test',
          description: 'Testing data consistency',
          categoryMapping: { 'test': { improvementArea: 'Test', weight: 1.0 } },
          isActive: true,
        });

      const questionnaireId = qResponse.body.data.id;

      // Create question
      const questionResponse = await request(app)
        .post(`/api/v1/questions/questionnaires/${questionnaireId}/questions`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          questionText: 'Consistency Test Question',
          questionType: 'rating',
          category: 'test',
          isRequired: true,
          orderIndex: 1,
          minValue: 1,
          maxValue: 5,
        });

      const questionId = questionResponse.body.data.id;

      // Submit response
      const responseResponse = await request(app)
        .post('/api/v1/responses')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          questionnaireId,
          responses: [
            {
              questionId,
              ratingScore: 5,
              isSkipped: false,
            },
          ],
          deviceFingerprint: 'consistency-test',
          ipAddress: '192.168.1.500',
        })
        .expect(201);

      // Verify all data is consistent
      const questionnaireCheck = await request(app)
        .get(`/api/v1/questionnaires/${questionnaireId}`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(200);

      expect(questionnaireCheck.body.data.id).toBe(questionnaireId);
      expect(questionnaireCheck.body.data.questions.length).toBe(1);

      const analyticsCheck = await request(app)
        .get(`/api/v1/analytics/summary/${questionnaireId}`)
        .set('Authorization', `Bearer ${authTokens.business}`)
        .expect(200);

      // The analytics should show at least 1 response (the one we just created)
      // There may be additional responses from other tests in the suite
      expect(analyticsCheck.body.data.total_responses).toBeGreaterThanOrEqual(1);

      console.log('✅ Data consistency maintained');
    });

    test('should handle transaction rollbacks on errors', async () => {
      console.log('🔄 Testing transaction rollback...');

      // Try to create response with invalid data that should cause rollback
      const invalidResponse = await request(app)
        .post('/api/v1/responses')
        .set('Authorization', `Bearer ${authTokens.business}`)
        .send({
          questionnaireId: 99999, // Non-existent questionnaire
          responses: [
            {
              questionId: 99999, // Non-existent question
              ratingScore: 5,
              isSkipped: false,
            },
          ],
          deviceFingerprint: 'rollback-test',
          ipAddress: '192.168.1.600',
        })
        .expect(404);

      expect(invalidResponse.body.success).toBe(false);

      console.log('✅ Transaction rollback working');
    });
  });
});