'use strict';

const request = require('supertest');
const { User, sequelize } = require('../../src/models');
const app = require('../../src/app-test');

describe('Simple Database Test', () => {
  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.INTEGRATION_TEST = 'true';

    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  test('should be able to create a user directly', async () => {
    // Try to create user without any sync
    try {
      const user = await User.createWithPassword({
        email: 'test@example.com',
        password: 'TestPassword123',
        first_name: 'John',
        last_name: 'Doe',
        subscription_plan: 'free',
        email_verified: true,
      });

      console.log('User created successfully:', user.id);
      expect(user).toBeTruthy();
      expect(user.email).toBe('test@example.com');
    } catch (error) {
      console.error('Error creating user:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up
    try {
      await sequelize.close();
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});