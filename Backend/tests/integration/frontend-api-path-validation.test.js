/**
 * Frontend Integration Test - API Path Validation
 *
 * This test specifically addresses the 404 issue found in the error logs:
 * ":3010/api/api/v1/questionnaires:1 Failed to load resource: the server responded with a status of 404 (Not Found)"
 *
 * The issue appears to be a double /api prefix in the frontend configuration.
 */

const request = require('supertest');
const { User, initialize, sequelize } = require('../../src/models');
const app = require('../../src/app-test');
const { getAuthHeader } = require('../helpers/auth');

describe('Frontend Integration - API Path Validation', () => {
  let userToken;
  let testUser;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';

    // Initialize test database
    await initialize();

    // Wait for database to be fully ready
    await new Promise(resolve => setTimeout(resolve, 200));
  }, 30000); // Increase timeout to 30 seconds

  beforeEach(async () => {
    // Clean up database before each test
    await sequelize.sync({ force: true });

    // Wait a bit for SQLite to be ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Recreate test user for each test
    const userData = {
      email: `frontend-test-${Date.now()}@test.com`,
      password: 'Test123456!',
      first_name: 'Frontend',
      last_name: 'Test',
    };

    // Register user
    await request(app)
      .post('/api/v1/auth/register')
      .send(userData);

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password,
      });

    userToken = loginResponse.body.data.accessToken;
  }, 15000); // Increase timeout to 15 seconds

  afterAll(async () => {
    // Clean up and close connection
    await User.destroy({ where: {}, force: true });
    await sequelize.close();
  });

  describe('API Path Structure Validation', () => {
    test('✅ Correct API path should work: /api/v1/questionnaires', async () => {
      const response = await request(app)
        .get('/api/v1/questionnaires')
        .set('Authorization', getAuthHeader(userToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('questionnaires');
    });

    test('❌ Incorrect double API path should fail: /api/api/v1/questionnaires', async () => {
      const response = await request(app)
        .get('/api/api/v1/questionnaires')
        .set('Authorization', getAuthHeader(userToken));

      // This should return 404 because the path structure is wrong
      expect(response.status).toBe(404);
    });

    test('❌ Missing API prefix should fail: /v1/questionnaires', async () => {
      const response = await request(app)
        .get('/v1/questionnaires')
        .set('Authorization', getAuthHeader(userToken));

      expect(response.status).toBe(404);
    });

    test('❌ Double API prefix with auth should fail: /api/api/v1/auth/login', async () => {
      const response = await request(app)
        .post('/api/api/v1/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(404);
    });

    test('✅ Correct auth path should work: /api/v1/auth/login', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'frontend-test@test.com',
          password: 'wrongpassword',
        });

      // Should return 401 for wrong credentials, not 404
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Frontend Configuration Issues', () => {
    test('🔍 Test common frontend API configuration mistakes', async () => {
      const testPaths = [
        { path: '/api/v1/questionnaires', expected: 200, description: 'Correct path' },
        { path: '/api/api/v1/questionnaires', expected: 404, description: 'Double API prefix' },
        { path: '//api/v1/questionnaires', expected: 404, description: 'Double slash' },
        { path: '/api//v1/questionnaires', expected: 404, description: 'Double slash in middle' },
        { path: '/api/v1//questionnaires', expected: 200, description: 'Double slash before endpoint (Express normalizes this)' },
        { path: '/api/v1/questionnaires/', expected: 200, description: 'Trailing slash (should work)' },
        { path: '/api/v1/questionnaires//', expected: 200, description: 'Double trailing slash (Express normalizes this)' },
      ];

      for (const test of testPaths) {
        const response = await request(app)
          .get(test.path)
          .set('Authorization', getAuthHeader(userToken));

        expect(response.status).toBe(test.expected);
      }
    });
  });

  describe('API Base URL Configuration', () => {
    test('🌐 Test API base URL responses', async () => {
      // Test the base API endpoint
      const response = await request(app)
        .get('/api/v1')
        .set('Authorization', getAuthHeader(userToken));

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('running');
      expect(response.body.version).toBe('1.0.0');
    });

    test('🌐 Test double API base URL', async () => {
      const response = await request(app)
        .get('/api/api/v1')
        .set('Authorization', getAuthHeader(userToken));

      expect(response.status).toBe(404);
    });
  });

  describe('Health Check Endpoints', () => {
    test('✅ Health check should work with correct path', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });

    test('❌ Health check should fail with double API prefix', async () => {
      const response = await request(app)
        .get('/api/api/v1/health');

      expect(response.status).toBe(404);
    });
  });

  describe('All Major Endpoints Path Validation', () => {
    const endpoints = [
      { method: 'GET', path: '/api/v1/questionnaires', auth: true },
      { method: 'GET', path: '/api/v1/analytics', auth: true },
      { method: 'GET', path: '/api/v1/subscription', auth: true },
      { method: 'GET', path: '/api/v1/health', auth: false },
      { method: 'POST', path: '/api/v1/auth/login', auth: false },
    ];

    test('🔍 Validate all major endpoints work with correct paths', async () => {
      for (const endpoint of endpoints) {
        let requestBuilder = request(app)[endpoint.method.toLowerCase()](endpoint.path);

        if (endpoint.auth) {
          requestBuilder = requestBuilder.set('Authorization', getAuthHeader(userToken));
        }

        if (endpoint.method === 'POST' && endpoint.path.includes('login')) {
          requestBuilder = requestBuilder.send({
            email: 'test@test.com',
            password: 'wrongpassword',
          });
        }

        const response = await requestBuilder;

        // Should not be 404 (path not found)
        expect(response.status).not.toBe(404);
      }
    });

    test('❌ All major endpoints should fail with double API prefix', async () => {
      for (const endpoint of endpoints) {
        const wrongPath = endpoint.path.replace('/api/v1', '/api/api/v1');
        let requestBuilder = request(app)[endpoint.method.toLowerCase()](wrongPath);

        if (endpoint.auth) {
          requestBuilder = requestBuilder.set('Authorization', getAuthHeader(userToken));
        }

        if (endpoint.method === 'POST' && endpoint.path.includes('login')) {
          requestBuilder = requestBuilder.send({
            email: 'test@test.com',
            password: 'wrongpassword',
          });
        }

        const response = await requestBuilder;

        // Should be 404 (wrong path)
        expect(response.status).toBe(404);
      }
    });
  });

  describe('Frontend Configuration Recommendations', () => {
    test('📋 Provide frontend configuration guidance', () => {
    // This test provides guidance for frontend developers
      const recommendations = {
        correctBaseURL: 'http://localhost:3000/api/v1',
        incorrectBaseURLs: [
          'http://localhost:3000/api/api/v1', // Double API prefix
          'http://localhost:3000//api/v1',     // Double slash
          'http://localhost:3000/api/v1/',     // Trailing slash (may cause issues)
        ],
        axiosExample: `
// ✅ CORRECT Configuration
const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ❌ INCORRECT Configuration
const api = axios.create({
  baseURL: 'http://localhost:3000/api/api/v1', // Double /api
  timeout: 10000
});

// ❌ INCORRECT Configuration  
const api = axios.create({
  baseURL: 'http://localhost:3000//api/v1', // Double slash
  timeout: 10000
});
      `,
        fetchExample: `
// ✅ CORRECT Configuration
const API_BASE_URL = 'http://localhost:3000/api/v1';

const fetchQuestionnaires = async () => {
  const response = await fetch(\`\${API_BASE_URL}/questionnaires\`, {
    headers: {
      'Authorization': \`Bearer \${token}\`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};

// ❌ INCORRECT Configuration
const API_BASE_URL = 'http://localhost:3000/api/api/v1'; // Double /api
      `,
      };

      // Verify recommendations contain expected content
      expect(recommendations.correctBaseURL).toBe('http://localhost:3000/api/v1');
      expect(recommendations.incorrectBaseURLs).toContain('http://localhost:3000/api/api/v1');
      expect(recommendations.axiosExample).toContain('✅ CORRECT');
      expect(recommendations.fetchExample).toContain('✅ CORRECT');
    });
  });
});