const { getDatabaseSecurityConfig, validateDatabaseSecurity, createSecureQuery, validateOrderParameter, validateWhereClause } = require('../../src/config/database-security');
const { Sequelize } = require('sequelize');

describe('Database Security Configuration', () => {
  describe('getDatabaseSecurityConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset environment before each test
      process.env = { ...originalEnv };
      // Clear pool override vars to use defaults in tests
      delete process.env.DB_POOL_MAX;
      delete process.env.DB_POOL_MIN;
      delete process.env.DB_POOL_ACQUIRE;
      delete process.env.DB_POOL_IDLE;
      delete process.env.DB_POOL_EVICT;
    });

    afterAll(() => {
      // Restore original environment
      process.env = originalEnv;
    });

    test('should return development configuration by default', () => {
      process.env.NODE_ENV = 'development';

      const config = getDatabaseSecurityConfig();

      expect(config.dialect).toBe('sqlite');
      expect(config.storage).toBe('./database.sqlite');
      expect(config.pool.max).toBe(1); // Development default
      expect(config.dialectOptions).toBeDefined();
    });

    test('should return production configuration with security settings', () => {
      process.env.NODE_ENV = 'production';
      process.env.DB_HOST = 'prod-host.com';
      process.env.DB_NAME = 'ulasis_prod';
      process.env.DB_USER = 'prod_user';
      process.env.DB_PASSWORD = 'secure_password';
      process.env.DB_SSL_REQUIRE = 'true';
      // Clear any pool max override to use default
      delete process.env.DB_POOL_MAX;

      const config = getDatabaseSecurityConfig();

      expect(config.dialect).toBe('mysql');
      expect(config.ssl.require).toBe(true);
      expect(config.pool.max).toBe(50); // Production default
      expect(config.dialectOptions.multipleStatements).toBe(false);
      expect(config.dialectOptions.ssl).toBeDefined();
    });

    test('should validate required environment variables for MySQL', () => {
      process.env.NODE_ENV = 'production'; // Force MySQL config
      // Clear all required environment variables
      delete process.env.DB_HOST;
      delete process.env.DB_NAME;
      delete process.env.DB_USER;

      // Missing required DB_HOST
      expect(() => {
        getDatabaseSecurityConfig();
      }).toThrow('Missing required database environment variables: DB_HOST, DB_NAME, DB_USER');
    });

    test('should configure SSL when required', () => {
      process.env.NODE_ENV = 'production';
      process.env.DB_HOST = 'test.com';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_password';
      process.env.DB_SSL_REQUIRE = 'true';
      process.env.DB_SSL_REJECT_UNAUTHORIZED = 'false';

      const config = getDatabaseSecurityConfig();

      expect(config.ssl.require).toBe(true);
      expect(config.ssl.rejectUnauthorized).toBe(false);
    });
  });

  describe('Database Security Integration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.DB_POOL_MAX;
      delete process.env.DB_POOL_MIN;
      delete process.env.DB_POOL_ACQUIRE;
      delete process.env.DB_POOL_IDLE;
      delete process.env.DB_POOL_EVICT;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    describe('SSL Configuration', () => {
      test('should require SSL in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.DB_HOST = 'test.com';
        process.env.DB_NAME = 'test_db';
        process.env.DB_USER = 'test_user';
        process.env.DB_PASSWORD = 'test_password';
        process.env.DB_SSL_REQUIRE = 'true';

        const config = getDatabaseSecurityConfig();
        expect(config.ssl.require).toBe(true);
      });

      test('should not configure SSL for SQLite in development', () => {
        process.env.NODE_ENV = 'development';
        // Ensure SSL is not required
        delete process.env.DB_SSL_REQUIRE;

        const config = getDatabaseSecurityConfig();
        expect(config.ssl).toBeUndefined(); // SQLite doesn't support SSL
      });
    });

    describe('Connection Pool Security', () => {
      test('should use appropriate pool sizes for different environments', () => {
        const testCases = [
          { env: 'development', expectedMax: 1 },
          { env: 'test', expectedMax: 1 },
          { env: 'staging', expectedMax: 20 },
          { env: 'production', expectedMax: 50 },
        ];

        testCases.forEach(({ env, expectedMax }) => {
          process.env.NODE_ENV = env;
          process.env.DB_HOST = 'test.com';
          process.env.DB_NAME = 'test_db';
          process.env.DB_USER = 'test_user';
          process.env.DB_PASSWORD = 'test_password';

          // Clear all pool overrides to use defaults
          delete process.env.DB_POOL_MAX;
          delete process.env.DB_POOL_MIN;
          delete process.env.DB_POOL_ACQUIRE;
          delete process.env.DB_POOL_IDLE;
          delete process.env.DB_POOL_EVICT;

          const config = getDatabaseSecurityConfig();
          expect(config.pool.max).toBe(expectedMax);
        });
      });
    });

    describe('Custom Configuration', () => {
      test('should accept custom pool configuration', () => {
        process.env.NODE_ENV = 'production';
        process.env.DB_HOST = 'test.com';
        process.env.DB_NAME = 'test_db';
        process.env.DB_USER = 'test_user';
        process.env.DB_PASSWORD = 'test_password';
        process.env.DB_POOL_MAX = '100';
        process.env.DB_POOL_MIN = '20';
        process.env.DB_CONNECT_TIMEOUT = '25000';
        process.env.DB_QUERY_TIMEOUT = '70000';

        const config = getDatabaseSecurityConfig();
        expect(config.dialectOptions.connectTimeout).toBe(25000);
        expect(config.dialectOptions.timeout).toBe(70000);
      });
    });
  });
});