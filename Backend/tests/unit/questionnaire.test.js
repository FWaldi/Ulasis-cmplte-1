'use strict';

// Load setup first to ensure mocks are configured
require('../setup');

const request = require('supertest');
const express = require('express');
const { Sequelize, Op } = require('sequelize');
const { Questionnaire, User } = require('../../src/models');
const { generateTestToken } = require('../helpers/auth');

// Create minimal app for testing to avoid hanging
const app = express();
app.use(express.json());

// Create test-specific auth middleware that properly handles authentication
const testAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      message: 'Access token is required. Please provide a valid Authorization header.',
    });
  }
  
  const token = authHeader.substring(7);
  
  // For test tokens, extract user ID and create mock user
  if (token.startsWith('test-access-token-')) {
    const userId = parseInt(token.split('-')[3]);
    req.user = {
      id: userId,
      email: `test${userId}@example.com`,
      subscription_plan: 'starter',
      subscription_status: 'active'
    };
    req.userId = userId;
    return next();
  }
  
  // Handle other test tokens
  if (token === 'expired-token') {
    return res.status(401).json({
      success: false,
      error: 'Token Expired',
      message: 'Your access token has expired. Please login again.',
    });
  }
  
  if (token === 'invalid-token') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Token',
      message: 'Invalid access token provided.',
    });
  }
  
  // Default to unauthorized for unknown tokens
  return res.status(401).json({
    success: false,
    error: 'Authentication Required',
    message: 'Access token is required. Please provide a valid Authorization header.',
  });
};

// Apply test auth middleware
app.use(testAuthMiddleware);

// Now load the routes after setting up auth
const questionnaireRoutes = require('../../src/routes/questionnaires');
app.use('/api/v1/questionnaires', questionnaireRoutes);

describe('Questionnaire API', () => {
  let testUser;
  let authToken;

  // Helper function to create test user and auth token
  const createTestUser = async () => {
    const user = await User.createWithPassword({
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123',
      first_name: 'Test',
      last_name: 'User',
      email_verified: true,
      subscription_plan: 'starter',
      subscription_status: 'active',
    });
    return {
      user,
      token: generateTestToken(user)
    };
  };

  // Helper function to clean up test data in proper order
  const cleanupTestData = async (testUser) => {
    const models = require('../../src/models');
    
    try {
      // First find all questionnaires for this user
      const userQuestionnaires = await models.Questionnaire.findAll({
        where: { userId: testUser.id },
        attributes: ['id']
      });
      const questionnaireIds = userQuestionnaires.map(q => q.id);
      
      if (questionnaireIds.length > 0) {
        // Delete questions first (they reference questionnaires)
        await models.Question.destroy({ 
          where: { questionnaireId: { [Op.in]: questionnaireIds } }, 
          force: true 
        });
        
        // Delete answers (they reference questions)
        await models.Answer.destroy({ 
          where: { questionId: { [Op.in]: questionnaireIds } }, 
          force: true 
        });
      }
      
      // Delete questionnaires
      await models.Questionnaire.destroy({ 
        where: { userId: testUser.id }, 
        force: true 
      });
      
      // Finally delete the user
      await models.User.destroy({ 
        where: { id: testUser.id }, 
        force: true 
      });
    } catch (error) {
      console.error('Cleanup error:', error);
      // Continue with user deletion even if other cleanup fails
      try {
        await models.User.destroy({ 
          where: { id: testUser.id }, 
          force: true 
        });
      } catch (userError) {
        console.error('User cleanup error:', userError);
      }
    }
  };


  describe('GET /api/v1/questionnaires/:id/statistics', () => {
    it('should get questionnaire statistics', async () => {
      // Create test user for this test
      const { user: testUser, token: authToken } = await createTestUser();
      
      // Create a fresh questionnaire for this test
      const testQuestionnaire = await Questionnaire.create({
        userId: testUser.id,
        title: 'Statistics Test Questionnaire',
        description: 'A test questionnaire for statistics',
        categoryMapping: {
          service: ['q1', 'q2'],
          product: ['q3', 'q4'],
        },
      });

      const response = await request(app)
        .get(`/api/v1/questionnaires/${testQuestionnaire.id}/statistics`)
        .set('Authorization', `Bearer ${authToken}`);

      // Debug: Log the response if it fails
      if (response.status !== 200) {
        console.log('Error response:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.questionnaire).toBeDefined();

      // Clean up the created questionnaire and user
      await Questionnaire.destroy({ where: { id: testQuestionnaire.id }, force: true });
      await User.destroy({ where: { id: testUser.id }, force: true });
    });
  });

  describe('POST /api/v1/questionnaires', () => {
    it('should create a new questionnaire with valid data', async () => {
      // Create test user for this test
      const { user: testUser, token: authToken } = await createTestUser();

      const questionnaireData = {
        title: 'New Test Questionnaire',
        description: 'A test questionnaire for unit testing',
      };

      const response = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authToken}`)
        .send(questionnaireData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(questionnaireData.title);

      // Clean up using helper function
      await cleanupTestData(testUser);
    });

    it('should reject questionnaire creation without title', async () => {
      // Create test user for this test
      const { user: testUser, token: authToken } = await createTestUser();

      const response = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Questionnaire without title',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');

      // Clean up using helper function
      await cleanupTestData(testUser);
    });

    it('should reject questionnaire creation for unauthenticated user', async () => {
      const response = await request(app)
        .post('/api/v1/questionnaires')
        .send({
          title: 'Unauthorized Questionnaire',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication Required');
      expect(response.body.message).toBe('Access token is required. Please provide a valid Authorization header.');
    });
  });

  describe('GET /api/v1/questionnaires', () => {
    it('should get user questionnaires with pagination', async () => {
      // Create test user for this test
      const { user: testUser, token: authToken } = await createTestUser();

      const response = await request(app)
        .get('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.questionnaires).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.usage).toBeDefined();

      // Clean up using helper function
      await cleanupTestData(testUser);
    });

    it('should filter questionnaires by category', async () => {
      // Create test user for this test
      const { user: testUser, token: authToken } = await createTestUser();

      const response = await request(app)
        .get('/api/v1/questionnaires?category=service')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.questionnaires).toBeInstanceOf(Array);

      // Clean up using helper function
      await cleanupTestData(testUser);
    });

    it('should reject unauthenticated access', async () => {
      const response = await request(app)
        .get('/api/v1/questionnaires');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication Required');
      expect(response.body.message).toBe('Access token is required. Please provide a valid Authorization header.');
    });
  });

  describe('GET /api/v1/questionnaires/:id', () => {
    it('should get a specific questionnaire by ID', async () => {
      // Create test user for this test
      const { user: testUser, token: authToken } = await createTestUser();
      
      // Create a questionnaire for this test
      const testQuestionnaire = await Questionnaire.create({
        userId: testUser.id,
        title: 'Test Questionnaire for Get Test',
        description: 'A test questionnaire created for GET test',
        categoryMapping: {
          service: ['q1', 'q2'],
          product: ['q3', 'q4'],
        },
      });

      const response = await request(app)
        .get(`/api/v1/questionnaires/${testQuestionnaire.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testQuestionnaire.id);
      expect(response.body.data.title).toBe(testQuestionnaire.title);

      // Clean up using helper function
      await cleanupTestData(testUser);
    });

    it('should return 404 for non-existent questionnaire', async () => {
      // Create test user for this test
      const { user: testUser, token: authToken } = await createTestUser();

      const response = await request(app)
        .get('/api/v1/questionnaires/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');

      // Clean up using helper function
      await cleanupTestData(testUser);
    });

    it('should prevent access to other users questionnaires', async () => {
      // Create test user for this test
      const { user: testUser, token: authToken } = await createTestUser();
      
      // Create a questionnaire for this test
      const testQuestionnaire = await Questionnaire.create({
        userId: testUser.id,
        title: 'Test Questionnaire for Security Test',
        description: 'A test questionnaire created for security test',
        categoryMapping: {
          service: ['q1', 'q2'],
          product: ['q3', 'q4'],
        },
      });

      // Create another user
      const otherUser = await User.createWithPassword({
        email: 'other@example.com',
        password: 'hashedpassword',
        first_name: 'Other',
        last_name: 'User',
      });

      const otherToken = generateTestToken(otherUser);

      const response = await request(app)
        .get(`/api/v1/questionnaires/${testQuestionnaire.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(404); // Returns 404 instead of 403 for security
      expect(response.body.success).toBe(false);

      // Clean up using helper function
      await cleanupTestData(testUser);
      await cleanupTestData(otherUser);
    });
  });

  describe('PUT /api/v1/questionnaires/:id', () => {
    it('should update questionnaire with valid data', async () => {
      // Create test user for this test
      const { user: testUser, token: authToken } = await createTestUser();
      
      // Create a separate questionnaire for update test
      const updateTestQuestionnaire = await Questionnaire.create({
        userId: testUser.id,
        title: 'Questionnaire for Update Test',
        description: 'A questionnaire created specifically for testing updates',
        categoryMapping: {
          service: ['q1', 'q2'],
          product: ['q3', 'q4'],
        },
      });

      const updateData = {
        title: 'Updated Questionnaire Title',
        description: 'Updated description',
        isActive: false,
      };

      const response = await request(app)
        .put(`/api/v1/questionnaires/${updateTestQuestionnaire.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.isActive).toBe(updateData.isActive);

      // Clean up
      await Questionnaire.destroy({ where: { id: updateTestQuestionnaire.id }, force: true });
      await User.destroy({ where: { id: testUser.id }, force: true });
    });

    it('should reject update with invalid data', async () => {
      // Create test user for this test
      const { user: testUser, token: authToken } = await createTestUser();
      
      // Create a separate questionnaire for validation test
      const validationTestQuestionnaire = await Questionnaire.create({
        userId: testUser.id,
        title: 'Questionnaire for Validation Test',
        description: 'A questionnaire created specifically for testing validation',
        categoryMapping: {
          service: ['q1', 'q2'],
          product: ['q3', 'q4'],
        },
      });

      const response = await request(app)
        .put(`/api/v1/questionnaires/${validationTestQuestionnaire.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '', // Empty title should fail validation
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');

      // Clean up
      await Questionnaire.destroy({ where: { id: validationTestQuestionnaire.id }, force: true });
      await User.destroy({ where: { id: testUser.id }, force: true });
    });
  });

  describe('DELETE /api/v1/questionnaires/:id', () => {
    it('should soft delete questionnaire', async () => {
      // Create test user for this test
      const { user: testUser, token: authToken } = await createTestUser();
      
      // Create a separate questionnaire for deletion test to avoid interfering with other tests
      const deleteTestQuestionnaire = await Questionnaire.create({
        userId: testUser.id,
        title: 'Questionnaire for Deletion Test',
        description: 'A questionnaire created specifically for testing deletion',
        categoryMapping: {
          service: ['q1', 'q2'],
          product: ['q3', 'q4'],
        },
      });

      const response = await request(app)
        .delete(`/api/v1/questionnaires/${deleteTestQuestionnaire.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('deleted successfully');

      // Verify it's soft deleted (shouldn't appear in normal queries)
      const getResponse = await request(app)
        .get(`/api/v1/questionnaires/${deleteTestQuestionnaire.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
      expect(getResponse.body.success).toBe(false);

      // Clean up
      await Questionnaire.destroy({ where: { id: deleteTestQuestionnaire.id }, force: true });
      await User.destroy({ where: { id: testUser.id }, force: true });
    });

    it('should return 404 when trying to delete non-existent questionnaire', async () => {
      // Create test user for this test
      const { user: testUser, token: authToken } = await createTestUser();

      const response = await request(app)
        .delete('/api/v1/questionnaires/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');

      // Clean up using helper function
      await cleanupTestData(testUser);
    });
  });


});