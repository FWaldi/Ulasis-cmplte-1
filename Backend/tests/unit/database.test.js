// Import the test database configuration directly since setup.js already mocks the main config
const databaseConfig = require('../../src/config/database-test');
const logger = require('../../src/utils/logger');

// Mock console to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Database Configuration', () => {
  beforeAll(() => {
    // Suppress console output during tests
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    // Restore console output
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('Configuration Validation', () => {
    test('should have sequelize instance defined', () => {
      expect(databaseConfig.sequelize).toBeDefined();
      expect(typeof databaseConfig.sequelize).toBe('object');
    });

    test('should have required methods', () => {
      expect(typeof databaseConfig.authenticate).toBe('function');
      expect(typeof databaseConfig.close).toBe('function');
      expect(typeof databaseConfig.healthCheck).toBe('function');
      expect(typeof databaseConfig.getConnectionPoolInfo).toBe('function');
      expect(typeof databaseConfig.initialize).toBe('function');
    });

    test('should have correct sequelize configuration', () => {
      const sequelize = databaseConfig.sequelize;

      expect(sequelize.options.dialect).toBe('sqlite');
      expect(sequelize.options.pool).toBeDefined();
      expect(sequelize.options.pool.max).toBeGreaterThan(0);
    });
  });

  describe('Connection Pool', () => {
    test('should return connection pool information', () => {
      const poolInfo = databaseConfig.getConnectionPoolInfo();

      expect(poolInfo).toBeDefined();
      expect(typeof poolInfo).toBe('object');
      expect(poolInfo).toHaveProperty('status');
    });

    test('should have valid pool configuration', () => {
      const config = databaseConfig.sequelize.options.pool;

      expect(config.max).toBeGreaterThan(0);
      expect(config.min).toBeGreaterThanOrEqual(0);
      expect(config.acquire).toBeGreaterThan(0);
      expect(config.idle).toBeGreaterThan(0);
    });
  });

  describe('Health Check', () => {
    test('should return health check structure', async () => {
      // Mock sequelize query to avoid actual database connection
      const originalQuery = databaseConfig.sequelize.query;
      databaseConfig.sequelize.query = jest.fn().mockResolvedValue([{ test: 1 }]);

      const health = await databaseConfig.healthCheck();

      expect(health).toBeDefined();
      expect(typeof health).toBe('object');
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('message');

      // Restore original method
      databaseConfig.sequelize.query = originalQuery;
    });
  });

  describe('Environment Configuration', () => {
    test('should use test database configuration', () => {
      const sequelize = databaseConfig.sequelize;

      // Check that it's using SQLite for testing
      expect(sequelize.options.dialect).toBe('sqlite');
      expect(sequelize.options.storage).toContain('test-');
      expect(sequelize.options.storage).toContain('.sqlite');
    });

    test('should have proper dialect options', () => {
      const sequelize = databaseConfig.sequelize;

      expect(sequelize.options.dialectOptions.foreignKeys).toBe(true);
      expect(sequelize.options.dialectOptions.busyTimeout).toBe(30000);
    });
  });

  describe('Error Handling', () => {
    test('should handle authentication errors gracefully', async () => {
      // Mock the authenticate method to fail
      const originalAuthenticate = databaseConfig.sequelize.authenticate;
      databaseConfig.sequelize.authenticate = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const result = await databaseConfig.authenticate();

      expect(result).toBe(false);

      // Restore original method
      databaseConfig.sequelize.authenticate = originalAuthenticate;
    });

    test('should handle close errors gracefully', async () => {
      // Mock close to throw an error
      const originalClose = databaseConfig.sequelize.close;
      databaseConfig.sequelize.close = jest.fn().mockRejectedValue(new Error('Close failed'));

      const result = await databaseConfig.close();

      expect(result).toBe(false);

      // Restore original method
      databaseConfig.sequelize.close = originalClose;
    });
  });
});