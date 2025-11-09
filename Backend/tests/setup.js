// Load environment variables first
require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';

// Set test environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

// Import mock utilities
const {
  mockQRCodes,
  mockDeletedQuestionnaires,
  mockUserUsageCounts,
  mockQuestionnaireCreationCount
} = require('./mocks/modelMocks');

// Export function to reset mock state for tests
global.resetMockQuestionnaireCount = function() {
  const { resetMockQuestionnaireCount } = require('./mocks/modelMocks');
  resetMockQuestionnaireCount();
};

// Initialize test database before all tests
const { initialize: initializeTestDb, cleanupAll } = require('../src/config/database-test');
const { initialize: initializeModels } = require('../src/models');

beforeAll(async () => {
  // Initialize the test database
  await initializeTestDb();
  
  // Initialize models (this will sync the database)
  await initializeModels();
});

// Global cleanup after all tests
afterAll(async () => {
  // Clean up database connections
  const { sequelize } = require('../src/config/database-test');
  
  try {
    if (sequelize) {
      await sequelize.close();
    }
  } catch (error) {
    // Ignore cleanup errors
  }
  
  // Clean up test database files
  try {
    await cleanupAll();
  } catch (error) {
    // Ignore cleanup errors
  }
});

// Add proper model initialization before each test (but skip for integration tests)
beforeEach(async () => {
  // Skip cleanup for integration tests - they handle their own database setup
  if (process.env.INTEGRATION_TEST === 'true') {
    return;
  }

  const { sequelize } = require('../src/config/database-test');

  // Reset mock subscription state
  resetMockSubscriptionState();

  // Wait a moment for models to be fully initialized
  await new Promise(resolve => setTimeout(resolve, 10));

  // Clear ALL data between tests to ensure proper isolation
  const transaction = await sequelize.transaction();
  try {
    // Get models to clean up
    const models = require('../src/models');
    
    // Clean everything in proper order to respect foreign key constraints
    // Check if models exist before trying to use them
    if (models.Answer) {
      await models.Answer.destroy({ where: {}, force: true, transaction });
    }
    if (models.Response) {
      await models.Response.destroy({ where: {}, force: true, transaction });
    }
    if (models.Question) {
      await models.Question.destroy({ where: {}, force: true, transaction });
    }
    if (models.QRCode) {
      await models.QRCode.destroy({ where: {}, force: true, transaction });
    }
    if (models.Questionnaire) {
      await models.Questionnaire.destroy({ where: {}, force: true, transaction });
    }
    if (models.SubscriptionUsage) {
      await models.SubscriptionUsage.destroy({ where: {}, force: true, transaction });
    }
    if (models.PaymentTransaction) {
      await models.PaymentTransaction.destroy({ where: {}, force: true, transaction });
    }
    if (models.Subscription) {
      await models.Subscription.destroy({ where: {}, force: true, transaction });
    }
    if (models.User) {
      await models.User.destroy({ where: {}, force: true, transaction });
    }
    if (models.NotificationHistory) {
      await models.NotificationHistory.destroy({ where: {}, force: true, transaction });
    }
    if (models.AuditLog) {
      await models.AuditLog.destroy({ where: {}, force: true, transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

// Mock external dependencies that don't work in test environment
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    resize: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-image-data')),
    metadata: jest.fn().mockResolvedValue({
      width: 100,
      height: 100,
      format: 'png',
    }),
  }));
});

// Mock upload middleware functions
jest.mock('../src/middleware/upload', () => ({
  upload: jest.fn().mockImplementation(() => ({
    single: jest.fn().mockReturnValue((req, res, next) => {
      console.log('DEBUG: upload.single middleware called');
      console.log('DEBUG: req.body =', req.body);
      // Handle mock file upload for testing
      if (req.body && req.body.mockFile) {
        console.log('DEBUG: Setting mock file');
        req.file = {
          fieldname: 'logo',
          originalname: 'test-logo.png',
          encoding: '7bit',
          mimetype: 'image/png',
          size: 1024,
          destination: 'uploads/qr-logos/1',
          filename: 'test-logo.png',
          path: 'uploads/qr-logos/1/test-logo.png'
        };
        
        // Handle invalid file mock
        if (req.body.invalidFile) {
          req.file.mimetype = 'application/octet-stream';
        }
      }
      next();
    }),
  })),
  fileSecurityMiddleware: jest.fn().mockImplementation((req, res, next) => {
    // Handle invalid file case
    if (req.file && req.file.mimetype === 'application/octet-stream') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'File type does not match its extension or content',
        },
      });
    }
    next();
  }),
  uploadRateLimitMiddleware: jest.fn().mockReturnValue((req, res, next) => next()),
  generateFileUrl: jest.fn((filename, userId) => {
    console.log('DEBUG: generateFileUrl called with', { filename, userId });
    return `http://localhost:3000/api/v1/uploads/qr-logos/${userId}/${filename}`;
  }),
  cleanupFile: jest.fn().mockResolvedValue(true),
  cleanupUserDirectory: jest.fn().mockResolvedValue(true),
}));

jest.mock('compression', () => {
  return jest.fn().mockReturnValue((req, res, next) => next());
});

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
  return jest.fn().mockReturnValue((req, res, next) => next());
});

jest.mock('fs-extra', () => {
  const actualFs = jest.requireActual('fs-extra');
  return {
    ...actualFs,
    ensureDir: jest.fn().mockResolvedValue(true),
    remove: jest.fn().mockResolvedValue(true),
    pathExists: jest.fn().mockResolvedValue(false),
    readFile: jest.fn().mockResolvedValue('mock file content'),
    writeFile: jest.fn().mockResolvedValue(true),
  };
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

// Mock Winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    add: jest.fn(), // Add missing add method
    transports: [],
  }),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    printf: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
  level: 'info',
}));

// Mock token blacklist service
jest.mock('../src/services/tokenBlacklistService', () => ({
  isBlacklisted: jest.fn().mockResolvedValue(false),
  blacklistToken: jest.fn().mockResolvedValue(true),
  addToBlacklist: jest.fn().mockResolvedValue(true),
  cleanupExpiredTokens: jest.fn().mockResolvedValue(true),
}));

// Mock QR code generation
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code-data'),
  toFile: jest.fn().mockResolvedValue(true),
}));



// Mock UUID generation
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-' + Math.random().toString(36).substr(2, 9)),
}));

// Mock crypto for password hashing
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockImplementation((password, saltRounds) => {
    // Return a proper bcrypt hash format for testing
    if (password === 'password123' || password === 'TestPassword123' || password === 'Password123' || password === 'Password123!' || password === 'Admin123!' || password === 'AdminPass123') {
      return Promise.resolve('$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvOa');
    }
    return Promise.resolve('$2b$12$mockhashedpasswordfortesting');
  }),
  compare: jest.fn().mockImplementation((password, hash) => {
    // For testing, consider common test passwords as matching
    if (password === 'password123' || password === 'TestPassword123' || password === 'Password123' || password === 'Password123!' || password === 'Admin123!' || password === 'AdminPass123') {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }),
  genSalt: jest.fn().mockResolvedValue('$2b$12$LQv3c1yqBWVHxkd0LHAkCO'),
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn((payload, secret, options) => {
    // Return different tokens based on the payload type
    if (payload && payload.type === 'refresh') {
      return `test-refresh-token-${payload.sub}`;
    } else {
      return `test-access-token-${payload.sub}`;
    }
  }),
  verify: jest.fn((token, secret, options) => {
    // Handle test tokens with user ID
    if (token && token.startsWith('test-access-token-')) {
      const parts = token.split('-');
      const userId = parseInt(parts[3]);
      // If userId is NaN (like for 'analytics'), use default user 1
      const validUserId = isNaN(userId) ? 1 : userId;
      return {
        userId: validUserId,
        email: `test${validUserId}@example.com`,
        sub: validUserId,
        type: 'access'
      };
    }
    if (token && token.startsWith('test-refresh-token-')) {
      const parts = token.split('-');
      const userId = parseInt(parts[3]);
      // If userId is NaN (like for 'analytics'), use default user 1
      const validUserId = isNaN(userId) ? 1 : userId;
      return {
        userId: validUserId,
        email: `test${validUserId}@example.com`,
        sub: validUserId,
        type: 'refresh',
        jti: 'test-jti-' + validUserId
      };
    }
    // Default mock payload
    return { userId: 1, email: 'test@example.com' };
  }),
  decode: jest.fn((token) => {
    // Handle test tokens with user ID
    if (token && token.startsWith('test-access-token-')) {
      const parts = token.split('-');
      const userId = parseInt(parts[3]);
      // If userId is NaN (like for 'analytics'), use default user 1
      const validUserId = isNaN(userId) ? 1 : userId;
      return {
        userId: validUserId,
        email: `test${validUserId}@example.com`,
        sub: validUserId,
        type: 'access'
      };
    }
    if (token && token.startsWith('test-refresh-token-')) {
      const parts = token.split('-');
      const userId = parseInt(parts[3]);
      // If userId is NaN (like for 'analytics'), use default user 1
      const validUserId = isNaN(userId) ? 1 : userId;
      return {
        userId: validUserId,
        email: `test${validUserId}@example.com`,
        sub: validUserId,
        type: 'refresh'
      };
    }
    // Default mock payload
    return { userId: 1, email: 'test@example.com' };
  }),
}));

// Note: Stripe mock removed as Stripe is not installed in this project
// If Stripe is added later, add mock here

// Reset function for mock subscription state
function resetMockSubscriptionState() {
  // Reset any global mock state if needed
  if (global.mockSubscriptionData) {
    global.mockSubscriptionData = {};
  }
}

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    email_verified: true,
    subscription_plan: 'free',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),
  
  createMockQuestionnaire: (overrides = {}) => ({
    id: 1,
    title: 'Test Questionnaire',
    description: 'Test Description',
    enterprise_id: 1,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),
  
  createMockResponse: (overrides = {}) => ({
    id: 1,
    questionnaire_id: 1,
    user_id: 1,
    response_data: {},
    submitted_at: new Date(),
    ...overrides,
  }),
};

// Add function to clear questionnaires for tests that need it
global.clearQuestionnaires = async () => {
  const { sequelize } = require('../src/config/database-test');
  try {
    const models = require('../src/models');
    
    // First try using model destroy method (safer)
    try {
      const transaction = await sequelize.transaction();
      try {
        // Clear in proper order to respect foreign key constraints
        if (models.Answer) {
          await models.Answer.destroy({ where: {}, force: true, transaction });
        }
        if (models.Response) {
          await models.Response.destroy({ where: {}, force: true, transaction });
        }
        if (models.Question) {
          await models.Question.destroy({ where: {}, force: true, transaction });
        }
        if (models.QRCode) {
          await models.QRCode.destroy({ where: {}, force: true, transaction });
        }
        if (models.Questionnaire) {
          await models.Questionnaire.destroy({ where: {}, force: true, transaction });
        }
        
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (modelError) {
      console.log('Model destroy failed, trying raw SQL...');
      
      // Fallback to raw SQL with table existence checks
      try {
        const tables = ['Answers', 'Responses', 'Questions', 'QR_Codes', 'Questionnaires'];
        for (const tableName of tables) {
          try {
            // Check if table exists first
            const tableExists = await sequelize.query(
              `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`,
              { type: sequelize.QueryTypes.SELECT }
            );
            
            if (tableExists.length > 0) {
              await sequelize.query(`DELETE FROM ${tableName}`, {
                type: sequelize.QueryTypes.DELETE
              });
            }
          } catch (tableError) {
            console.log(`Failed to clear table ${tableName}:`, tableError.message);
          }
        }
      } catch (sqlError) {
        console.log('Raw SQL cleanup failed:', sqlError.message);
      }
    }
  } catch (error) {
    console.log('Clear questionnaires failed:', error.message);
  }
};

// Add function to reset mock subscription state for tests
global.resetMockSubscriptionState = function() {
  // Reset any global mock state if needed
  if (global.mockSubscriptionData) {
    global.mockSubscriptionData = {};
  }
  // Reset subscription usage counts
  if (global.mockUsageCounts) {
    global.mockUsageCounts = {};
  }
};

// Silence console.log in tests unless explicitly needed
if (!process.env.VERBOSE_TESTS) {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}