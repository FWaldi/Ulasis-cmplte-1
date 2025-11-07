'use strict';

const { sequelize } = require('../../src/config/database');
const { User, initialize } = require('../../src/models');
const authService = require('../../src/services/authService');
const tokenUtils = require('../../src/utils/tokenUtils');

describe('Authentication Service', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('User Registration', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: 'test2@example.com',
        password: 'TestPassword123',
        first_name: 'John',
        last_name: 'Doe',
      };

      const result = await authService.register(userData);

      expect(result.success).toBe(true);
      const user = await User.findByEmail(userData.email);
      expect(user).toBeTruthy();
      expect(user.email).toBe('test2@example.com');
    });
  });

  describe('User Login', () => {
    test('should login user with correct credentials', async () => {
      await User.createWithPassword({
        email: 'test3@example.com',
        password: 'TestPassword123',
        first_name: 'Test',
        last_name: 'User',
        email_verified: true,
      });

      const loginData = {
        email: 'test3@example.com',
        password: 'TestPassword123',
      };

      const result = await authService.login(loginData);
      expect(result.success).toBe(true);
    });
  });
});
