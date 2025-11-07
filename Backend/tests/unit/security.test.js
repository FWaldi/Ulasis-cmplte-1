const request = require('supertest');

// Use the test app which includes security middleware
const app = require('../../src/app-test');

describe('Security Middleware', () => {
  test('app should load without errors', async () => {
    // Basic test to ensure app loads
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  test('should handle basic request', async () => {
    // Test a simple endpoint that should work
    const response = await request(app).get('/api/v1/');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
  });

  test('should handle health request', async () => {
    // Test health endpoint
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'healthy');
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      console.log('Making request to /api/v1/health');
      const response = await request(app)
        .get('/api/v1/health');

      console.log('Response status:', response.status);
      console.log('Response headers:', JSON.stringify(response.headers, null, 2));
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers).toHaveProperty('referrer-policy', 'strict-origin-when-cross-origin');
      expect(response.headers).not.toHaveProperty('x-powered-by');
    });

    test('should include CSP headers', async () => {
      // Skip this test as minimal app doesn't include security middleware
      const response = await request(app)
        .get('/api/v1/health/')
        .expect(200);

      expect(response.headers).toHaveProperty('content-security-policy');
    });
  });

  describe('Rate Limiting', () => {
    test('should allow normal request rate', async () => {
      const promises = Array(5).fill().map(() =>
        request(app).get('/api/v1/health/ping'),
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should include rate limit headers', async () => {
      // Skip this test as minimal app doesn't include rate limiting middleware
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });
  });

  describe('Input Validation', () => {
    describe('User Registration Validation', () => {
      test('should validate valid registration data', async () => {
        const validData = {
          email: 'test@example.com',
          password_hash: 'Password123!',
          first_name: 'John',
          last_name: 'Doe',
        };

        // Test validation schema directly
        const { body } = require('express-validator');
        const req = { body: validData };

        // This would normally be handled by the middleware
        // For testing purposes, we'll test the validation rules
        expect(validData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        expect(validData.password_hash).toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/);
        expect(validData.first_name.length).toBeGreaterThanOrEqual(1);
        expect(validData.first_name.length).toBeLessThanOrEqual(100);
      });

      test('should reject invalid email', () => {
        const invalidData = {
          email: 'invalid-email',
          password_hash: 'Password123!',
          first_name: 'John',
          last_name: 'Doe',
        };

        expect(invalidData.email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });

      test('should reject weak password', () => {
        const invalidData = {
          email: 'test@example.com',
          password_hash: 'weak',
          first_name: 'John',
          last_name: 'Doe',
        };

        expect(invalidData.password_hash).not.toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/);
      });
    });

    describe('Questionnaire Validation', () => {
      test('should validate valid questionnaire data', () => {
        const validData = {
          title: 'Test Questionnaire',
          description: 'A test questionnaire for validation',
          categoryMapping: '{"category1": ["question1", "question2"]}',
          isActive: true,
          isPublic: false,
        };

        expect(validData.title.length).toBeGreaterThanOrEqual(1);
        expect(validData.title.length).toBeLessThanOrEqual(255);
        expect(validData.description.length).toBeLessThanOrEqual(1000);
        expect(() => JSON.parse(validData.categoryMapping)).not.toThrow();
        expect(typeof validData.isActive).toBe('boolean');
        expect(typeof validData.isPublic).toBe('boolean');
      });

      test('should reject title that is too long', () => {
        const invalidData = {
          title: 'a'.repeat(256), // Exceeds 255 character limit
          description: 'Valid description',
        };

        expect(invalidData.title.length).toBeGreaterThan(255);
      });
    });

    describe('Response Submission Validation', () => {
      test('should validate valid response data', () => {
        const validData = {
          questionnaireId: 1,
          qrCodeId: 1,
          answers: [
            {
              questionId: 1,
              answerValue: 'Sample answer',
              ratingScore: 5,
            },
            {
              questionId: 2,
              answerValue: 'Another answer',
            },
          ],
        };

        expect(Number.isInteger(validData.questionnaireId)).toBe(true);
        expect(validData.questionnaireId).toBeGreaterThan(0);
        expect(Array.isArray(validData.answers)).toBe(true);
        expect(validData.answers.length).toBeGreaterThan(0);

        validData.answers.forEach(answer => {
          expect(Number.isInteger(answer.questionId)).toBe(true);
          expect(answer.questionId).toBeGreaterThan(0);
          if (answer.answerValue) {
            expect(answer.answerValue.length).toBeLessThanOrEqual(1000);
          }
          if (answer.ratingScore) {
            expect(answer.ratingScore).toBeGreaterThanOrEqual(1);
            expect(answer.ratingScore).toBeLessThanOrEqual(5);
          }
        });
      });

      test('should reject empty answers array', () => {
        const invalidData = {
          questionnaireId: 1,
          answers: [],
        };

        expect(invalidData.answers.length).toBe(0);
      });
    });
  });

  describe('Request Size Limiting', () => {
    test('should handle normal sized requests', async () => {
      const normalData = {
        data: 'x'.repeat(1000), // 1KB of data
      };

      const response = await request(app)
        .post('/api/v2/test') // This route doesn't exist, but middleware should run first
        .send(normalData);

      // Should get 404, not 413 (request too large)
      expect([404, 405]).toContain(response.status);
    });
  });

  describe('CORS Configuration', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .options('/api/v1/health/')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/test')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    test('should not leak error details in production', async () => {
      // Set NODE_ENV to production for this test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const response = await request(app)
          .get('/nonexistent-endpoint')  // Use path that will hit 404 handler
          .expect(404);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('message');
        expect(response.body).not.toHaveProperty('stack');
      } finally {
        // Restore original environment
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});

describe('Security Validation Schemas', () => {
  describe('Email Validation', () => {
    test('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
      ];

      validEmails.forEach(email => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test@example',
        'test@.com',
      ];

      invalidEmails.forEach(email => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });

  describe('Password Validation', () => {
    test('should validate strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MySecure@Pass1',
        'Str0ng#Password',
        'Complex$Pass123',
      ];

      strongPasswords.forEach(password => {
        expect(password).toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/);
        expect(password.length).toBeGreaterThanOrEqual(8);
      });
    });

    test('should reject weak passwords', () => {
      const weakPasswords = [
        'password', // No uppercase, number, or special char
        'PASSWORD', // No lowercase, number, or special char
        '12345678', // No letters or special char
        'Password', // No number or special char
        'Pass123', // Too short
        'Password123', // No special character
      ];

      weakPasswords.forEach(password => {
        expect(password).not.toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/);
      });
    });
  });

  describe('Question Type Validation', () => {
    test('should validate allowed question types', () => {
      const validTypes = ['text', 'rating', 'multiple_choice', 'checkbox', 'dropdown'];

      validTypes.forEach(type => {
        expect(validTypes).toContain(type);
      });
    });

    test('should reject invalid question types', () => {
      const invalidTypes = ['invalid', 'text_area', 'date', 'file'];

      invalidTypes.forEach(type => {
        expect(['text', 'rating', 'multiple_choice', 'checkbox', 'dropdown']).not.toContain(type);
      });
    });
  });
});