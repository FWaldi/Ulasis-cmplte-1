// console.log('DEBUG: database-test.js is being loaded!');

const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Singleton pattern - ensure same database instance is used throughout test run
let sequelize = null;
let testDbPath = null;

// Initialize database only once
if (!sequelize) {
  // Generate unique database name for each test run to avoid conflicts
  const testId = crypto.randomBytes(8).toString('hex');
  testDbPath = path.join(__dirname, '../../tests/temp', `test-${testId}.sqlite`);

  // Debug: Log database path
  // console.log(`DEBUG: Test database path: ${testDbPath}`);

  // Ensure test directory exists
  const testDir = path.dirname(testDbPath);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Create SQLite database for testing (exact copy from database.js)
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

} // End of singleton initialization

// Test database connection
const authenticate = async () => {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    logger.error('Test database connection failed:', error);
    return false;
  }
};

// Close database connection
const close = async () => {
  try {
    // Close connection with timeout
    if (sequelize && !sequelize.connectionManager.isClosed) {
      await Promise.race([
        sequelize.close(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database close timeout')), 5000)
        )
      ]);
    }
    
    // Clean up test database file with retry
    if (testDbPath && fs.existsSync(testDbPath)) {
      const maxRetries = 5;
      for (let i = 0; i <= maxRetries; i++) {
        try {
          fs.unlinkSync(testDbPath);
          break;
        } catch (error) {
          if (error.code === 'EBUSY' && i < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 200));
            continue;
          }
          throw error;
        }
      }
    }
    return true;
  } catch (error) {
    // Only log in non-test environments to reduce noise
    if (process.env.NODE_ENV !== 'test') {
      logger.error('Error closing test database:', error);
    }
    return false;
  }
};

// Clean up all test database files with enhanced retry mechanism
const cleanupAll = async () => {
  const maxRetries = 10;
  const retryDelay = 200; // 200ms
  const maxDelay = 2000; // 2 seconds max delay

  const cleanupFile = async (filePath) => {
    for (let retries = 0; retries <= maxRetries; retries++) {
      try {
        if (fs.existsSync(filePath)) {
          // Try to close any open connections first
          if (sequelize && !sequelize.connectionManager.isClosed) {
            await sequelize.close();
          }
          
          // Force garbage collection to help release file locks
          if (global.gc) {
            global.gc();
          }
          
          // Wait a bit before attempting deletion
          await new Promise(resolve => setTimeout(resolve, 50));
          
          fs.unlinkSync(filePath);
        }
        return true;
      } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'ENOTEMPTY') {
          if (retries < maxRetries) {
            // Exponential backoff with jitter
            const delay = Math.min(retryDelay * Math.pow(2, retries) + Math.random() * 100, maxDelay);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // Log error only if not in test environment to avoid noise
        if (process.env.NODE_ENV !== 'test') {
          logger.error(`Error cleaning up test database ${filePath}:`, error);
        }
        return false;
      }
    }
    return false;
  };

  try {
    const testDir = path.join(__dirname, '../../tests/temp');
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir);
      
      // Clean up both .sqlite and .sqlite-journal files
      for (const file of files) {
        if ((file.startsWith('test-') && file.endsWith('.sqlite')) || 
            (file.startsWith('test-') && file.endsWith('.sqlite-journal'))) {
          const filePath = path.join(testDir, file);
          await cleanupFile(filePath);
        }
      }
      
      // Also clean up any backup directory
      const backupDir = path.join(testDir, 'backups');
      if (fs.existsSync(backupDir)) {
        const backupFiles = fs.readdirSync(backupDir);
        for (const file of backupFiles) {
          const filePath = path.join(backupDir, file);
          await cleanupFile(filePath);
        }
      }
    }
    return true;
  } catch (error) {
    // Avoid logging after tests are done
    if (process.env.NODE_ENV !== 'test') {
      logger.error('Error cleaning up test databases:', error);
    }
    return false;
  }
};

// Database health check
const healthCheck = async () => {
  try {
    await sequelize.query('SELECT 1');
    return {
      status: 'healthy',
      message: 'Test database is responding',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
    };
  }
};

// Get connection pool information (for performance monitor compatibility)
const getPoolInfo = () => {
  return {
    status: 'Test database uses SQLite',
    used: 0,
    free: 1,
    pending: 0,
    total: 1,
    max: 1,
    min: 0,
    acquire: 15000,
    idle: 5000,
    evict: 500,
  };
};

// Get connection pool information
const getConnectionPoolInfo = () => {
  if (!sequelize || !sequelize.connectionManager) {
    return {
      error: 'Sequelize instance not available',
    };
  }

  const pool = sequelize.connectionManager.pool;

  if (!pool) {
    return {
      error: 'Connection pool not available',
    };
  }

  // Handle different Sequelize pool APIs
  const getUsed = typeof pool.numUsed === 'function' ? pool.numUsed() : pool.used || 0;
  const getFree = typeof pool.numFree === 'function' ? pool.numFree() : pool.free || 0;
  const getPending =
    typeof pool.numPendingAcquires === 'function' ? pool.numPendingAcquires() : pool.pending || 0;

  return {
    total: getUsed + getFree,
    used: getUsed,
    free: getFree,
    pending: getPending,
    max: pool.options?.max || pool.max || 0,
    min: pool.options?.min || pool.min || 0,
    status: 'Test database uses SQLite',
  };
};

// Initialize test database
const initialize = async () => {
  try {
    const connected = await authenticate();
    if (!connected) {
      throw new Error('Failed to connect to test database');
    }

    // Don't sync here - models will handle sync when loaded
    return true;
  } catch (error) {
    logger.error('Test database initialization failed:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  authenticate,
  close,
  healthCheck,
  getConnectionPoolInfo,
  getPoolInfo,
  initialize,
  cleanupAll,
};
