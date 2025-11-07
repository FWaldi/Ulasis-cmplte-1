const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
const {
  getDatabaseSecurityConfig,
  validateDatabaseSecurity,
  getPoolInfo,
} = require('./database-security');

// Get secure database configuration
const dbConfig = getDatabaseSecurityConfig();

// Use test database for testing
let sequelize;
if (process.env.NODE_ENV === 'test') {
  const { Sequelize } = require('sequelize');
  const path = require('path');
  const fs = require('fs');
  const crypto = require('crypto');

  // Generate unique database name for each test run to avoid conflicts
  const testId = crypto.randomBytes(8).toString('hex');
  const testDbPath = path.join(__dirname, '../../tests/temp', `test-${testId}.sqlite`);

  // Ensure test directory exists
  const testDir = path.dirname(testDbPath);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: testDbPath,
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true,
    },
    dialectOptions: {
      foreignKeys: true,
      busyTimeout: 30000,
    },
    pool: {
      max: 1,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
} else {
  // Create Sequelize instance with security configuration
  sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);
}

// Test database connection
const authenticate = async () => {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    console.log('Unable to connect to database:', error);
    logger.error('Unable to connect to database:', error);
    return false;
  }
};

// Get connection pool information
const getConnectionPoolInfo = () => {
  return getPoolInfo(sequelize);
};

// Close database connection
const close = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed successfully');
    return true;
  } catch (error) {
    logger.error('Error closing database connection:', error);
    return false;
  }
};

// Database health check
const healthCheck = async () => {
  try {
    await sequelize.query('SELECT 1');
    return {
      status: 'healthy',
      message: 'Database is responding',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
    };
  }
};

// Initialize database connection
const initialize = async () => {
  try {
    console.log('Initializing database...');
    // Test connection
    const connected = await authenticate();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Validate security configuration
    console.log('Validating security...');
    const securityValidation = await validateDatabaseSecurity(sequelize);
    if (!securityValidation.secure && process.env.NODE_ENV === 'production') {
      logger.warn('Database connection is not fully secure in production');
    }

    // Sync models disabled here - handled in models/index.js
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('Syncing models...');
    //   await sequelize.sync({ alter: false });
    //   console.log('Database models synchronized');
    //   logger.info('Database models synchronized');
    // }

    console.log('Database initialized successfully');
    logger.info('Database initialized successfully with security validation');
    return true;
  } catch (error) {
    console.log('Database initialization failed:', error);
    logger.error('Database initialization failed:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  config: sequelize.config,
  authenticate,
  close,
  healthCheck,
  getConnectionPoolInfo,
  initialize,
};
