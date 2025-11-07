const testConfig = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3001, // Different port for testing
    host: '127.0.0.1',
  },

  // Database Configuration (test database)
  database: {
    host: process.env.DB_HOST_TEST || process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT_TEST || process.env.DB_PORT || 3306,
    database: process.env.DB_NAME_TEST || 'ulasis_test',
    username: process.env.DB_USER_TEST || process.env.DB_USER || 'root',
    password: process.env.DB_PASS_TEST || process.env.DB_PASS || '',
    dialect: 'mysql',
    timezone: '+00:00',

    // Test connection pool (small)
    pool: {
      max: 3,
      min: 0,
      acquire: 10000,
      idle: 5000,
    },

    // Test logging (minimal)
    logging: false,

    // Test dialect options
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      ssl: false,
    },
  },

  // Security Configuration (test-friendly)
  security: {
    bcryptRounds: 4, // Fast for testing
    passwordMinLength: 6,
    sessionSecret: 'test-session-secret-for-testing-only',
    jwtSecret: 'test-jwt-secret-for-testing-only-min-32-chars',
  },

  // CORS Configuration (permissive for testing)
  cors: {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  // Rate Limiting (disabled for testing)
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 10000, // Very high limit for testing
    skip: () => true, // Skip rate limiting in tests
  },

  // Logging Configuration (minimal for testing)
  logging: {
    level: 'error', // Only errors in tests
    file: 'logs/test.log',
    maxSize: '10m',
    maxFiles: 3,
    console: false,
    colorize: false,
  },

  // Email Configuration (mock for testing)
  email: {
    host: 'localhost',
    port: 1025,
    secure: false,
    auth: {
      user: 'test@example.com',
      pass: 'test',
    },
    from: 'test@ulasis.test',
    mock: true, // Use mock email service
  },

  // File Upload Configuration (test-friendly)
  upload: {
    maxSize: 1024 * 1024, // 1MB for testing
    allowedTypes: ['image/jpeg', 'image/png'],
    destination: 'uploads/test/',
    memoryStorage: true, // Use memory storage for tests
  },

  // API Configuration
  api: {
    version: 'v1',
    prefix: '/api/v1',
    rateLimitStrict: false,
    documentation: false,
    swaggerEnabled: false,
  },

  // Test-specific configuration
  test: {
    databaseReset: true,
    mockData: true,
    isolation: true,
    timeout: 10000,
    retries: 3,
    parallel: true,
    coverage: true,
    fixtures: 'tests/fixtures/',
    seeds: 'tests/seeds/',
  },

  // Jest configuration
  jest: {
    testEnvironment: 'node',
    collectCoverageFrom: ['src/**/*.js', '!src/config/database.js', '!src/migrations/**'],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testMatch: ['**/tests/**/*.test.js'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testTimeout: 10000,
  },
};

module.exports = testConfig;
