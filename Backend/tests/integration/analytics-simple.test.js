'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../src/app-test');
const { sequelize } = require('../../src/config/database-test');
const { User, Questionnaire, Question, Response, Answer } = require('../../src/models');

// Use the auth middleware mock from setup.js - no need to re-mock it

describe('Analytics API Simple Test', () => {
  let testUser, authToken, testQuestionnaire;

  beforeAll(async () => {
    console.log('Starting analytics simple test setup...');

    // Ensure test database is clean
    console.log('Syncing database...');
    await sequelize.sync({ force: true });
    console.log('Database synced successfully');

    // Create test user via registration to ensure proper password hashing
    console.log('Creating test user...');
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'analytics-test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      })
      .expect(201);

    // Update user with business plan
    testUser = await User.findByPk(registerResponse.body.data.user_id);
    await testUser.update({
      subscription_plan: 'business',
      email_verified: true,
    });
    console.log('Test user created successfully');

    // Use mock auth token
    authToken = 'test-access-token-analytics-business';

    // Create test questionnaire
    console.log('Creating test questionnaire...');
    testQuestionnaire = await Questionnaire.create({
      userId: testUser.id,
      title: 'Analytics Test Questionnaire',
      description: 'Test questionnaire for analytics',
      categoryMapping: {
        'service': { improvementArea: 'Service Quality', weight: 1.0 },
        'product': { improvementArea: 'Product Quality', weight: 1.2 },
        'ambience': { improvementArea: 'Ambience', weight: 0.8 },
      },
      isActive: true,
    });
    console.log('Test questionnaire created successfully');
  });

  afterAll(async () => {
    console.log('Cleaning up analytics simple test...');
    await sequelize.sync({ force: true });
    await sequelize.close();
    console.log('Cleanup completed');
  });

  it('should setup test data correctly', async () => {
    expect(testUser).toBeTruthy();
    expect(testUser.email).toBe('analytics-test@example.com');
    expect(testQuestionnaire).toBeTruthy();
    expect(testQuestionnaire.title).toBe('Analytics Test Questionnaire');
  });

  it('should return 404 for non-existent questionnaire', async () => {
    const response = await request(app)
      .get('/api/v1/analytics/bubble/99999')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('ANALYTICS_ERROR_001');
  });

  it('should return 401 without authentication', async () => {
    await request(app)
      .get(`/api/v1/analytics/bubble/${testQuestionnaire.id}`)
      .expect(401);
  });
});