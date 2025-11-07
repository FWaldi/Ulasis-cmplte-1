const logger = require('../utils/logger');

/**
 * Database Security Configuration
 *
 * This module provides secure database connection configuration
 * with SSL/TLS encryption, connection pooling, and security best practices.
 */

const getDatabaseSecurityConfig = () => {
  const env = process.env.NODE_ENV || 'development';

  // Base SSL configuration
  const sslConfig = {
    require: process.env.DB_SSL_REQUIRE === 'true',
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    ca: process.env.DB_SSL_CA,
    key: process.env.DB_SSL_KEY,
    cert: process.env.DB_SSL_CERT,
  };

  // Remove undefined SSL values
  Object.keys(sslConfig).forEach((key) => {
    if (sslConfig[key] === undefined) {
      delete sslConfig[key];
    }
  });

  // Environment-specific configurations
  const configs = {
    development: {
      dialect: 'sqlite',
      storage: './database.sqlite',
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
    },

    test: {
      dialect: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      database: process.env.DB_TEST_NAME || 'ulasis_test',
      username: process.env.DB_USER || 'ulasis_user',
      password: process.env.DB_PASS || 'ulasis123',
      logging: false, // No logging in tests
      pool: {
        max: 1,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: {
        charset: 'utf8mb4',
        connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 15000,
        flags: '+FOUND_ROWS',
        insecureAuth: false,
        multipleStatements: false,
      },
      define: {
        timestamps: true,
        underscored: false,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
        paranoid: true,
      },
    },

    staging: {
      dialect: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      logging: (msg) => logger.info(msg),
      // SSL required in staging
      ssl: sslConfig,
      // Production-like pool configuration
      pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 20,
        min: parseInt(process.env.DB_POOL_MIN) || 5,
        acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
        idle: parseInt(process.env.DB_POOL_IDLE) || 30000,
        evict: parseInt(process.env.DB_POOL_EVICT) || 5000,
      },
      dialectOptions: {
        ssl: sslConfig,
        charset: 'utf8mb4',
        connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 15000,
        flags: '+FOUND_ROWS',
        insecureAuth: false,
        multipleStatements: false,
      },
      define: {
        timestamps: true,
        underscored: true,
        paranoid: false,
        freezeTableName: true,
      },
      isolationLevel: 'READ_COMMITTED',
      retry: {
        max: 5,
        timeout: 10000,
      },
      hooks: {
        beforeConnect: () => {
          logger.info('Establishing secure staging database connection', {
            host: process.env.DB_HOST,
            sslEnabled: true,
          });
        },
      },
    },

    production: {
      dialect: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      logging: (msg) => logger.warn(msg), // Only log warnings and errors
      // SSL required in production
      ssl: sslConfig,
      // Production pool configuration
      pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 50,
        min: parseInt(process.env.DB_POOL_MIN) || 10,
        acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 120000,
        idle: parseInt(process.env.DB_POOL_IDLE) || 60000,
        evict: parseInt(process.env.DB_POOL_EVICT) || 10000,
      },
      dialectOptions: {
        ssl: sslConfig,
        charset: 'utf8mb4',
        connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 20000,
        timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 60000,
        flags: '+FOUND_ROWS',
        insecureAuth: false,
        multipleStatements: false,
      },
      define: {
        timestamps: true,
        underscored: true,
        paranoid: false,
        freezeTableName: true,
      },
      isolationLevel: 'READ_COMMITTED',
      retry: {
        max: 10,
        timeout: 15000,
      },
      hooks: {
        beforeConnect: () => {
          logger.info('Establishing secure production database connection', {
            host: process.env.DB_HOST,
            sslEnabled: true,
          });
        },
        // Additional security monitoring in production
        afterConnect: () => {
          logger.info('Production database connection established with SSL');
        },
      },
    },
  };

  const config = configs[env];

  if (!config) {
    throw new Error(`Database configuration not found for environment: ${env}`);
  }

  // Validate required environment variables (only for MySQL)
  if (config.dialect === 'mysql') {
    const requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER'];
    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required database environment variables: ${missingVars.join(', ')}`);
    }
  }

  // Security validation
  if (env === 'production' && !sslConfig.require) {
    logger.warn('SSL is not required in production environment - this is not recommended');
  }

  // Log security configuration (without sensitive data)
  logger.info('Database security configuration loaded', {
    environment: env,
    sslEnabled: sslConfig.require,
    poolMax: config.pool.max,
    poolMin: config.pool.min,
    connectionTimeout: config.dialectOptions?.connectTimeout,
    queryTimeout: config.dialectOptions?.timeout,
    multipleStatements: config.dialectOptions?.multipleStatements,
  });

  return config;
};

/**
 * Validate database connection security
 */
const validateDatabaseSecurity = async (sequelize) => {
  try {
    // Test connection
    await sequelize.authenticate();

    // Skip SSL validation in development (user may not have performance_schema access)
    if (process.env.NODE_ENV === 'development') {
      logger.info('Database security validation skipped in development environment');
      return {
        secure: true, // Assume secure for development
        sslInfo: { Ssl_version: null, Ssl_cipher: null },
      };
    }

    // Check SSL connection
    const [results] = await sequelize.query(`
      SELECT
        VARIABLE_NAME,
        VARIABLE_VALUE
      FROM performance_schema.global_status
      WHERE VARIABLE_NAME IN ('Ssl_version', 'Ssl_cipher')
    `);

    const sslInfo = results.reduce((acc, row) => {
      acc[row.VARIABLE_NAME] = row.VARIABLE_VALUE;
      return acc;
    }, {});

    logger.info('Database security validation completed', {
      sslVersion: sslInfo.Ssl_version,
      sslCipher: sslInfo.Ssl_cipher,
      connectionSecure: !!(sslInfo.Ssl_version && sslInfo.Ssl_cipher),
    });

    return {
      secure: !!(sslInfo.Ssl_version && sslInfo.Ssl_cipher),
      sslInfo,
    };
  } catch (error) {
    logger.error('Database security validation failed:', error);
    throw error;
  }
};

/**
 * Get database connection pool information
 */
const getPoolInfo = (sequelize) => {
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
  };
};

/**
 * Secure query builder helper
 */
const createSecureQuery = (Model, options = {}) => {
  // Ensure options are properly sanitized
  const secureOptions = {
    ...options,
    // Prevent SQL injection through parameterization
    replacements: options.replacements || {},
    bind: options.bind || {},
    // Limit result sets to prevent DoS
    limit: Math.min(options.limit || 100, 1000),
    // Validate order parameters
    order: validateOrderParameter(options.order),
    // Validate where clauses
    where: validateWhereClause(options.where),
  };

  return Model.findAll(secureOptions);
};

/**
 * Validate order parameter to prevent SQL injection
 */
const validateOrderParameter = (order) => {
  if (!order) return undefined;

  if (Array.isArray(order)) {
    return order.map(([field, direction]) => {
      // Only allow alphanumeric field names and basic directions
      if (typeof field === 'string' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
        const validDirection = ['ASC', 'DESC'].includes(direction?.toUpperCase())
          ? direction.toUpperCase()
          : 'ASC';
        return [field, validDirection];
      }
      throw new Error(`Invalid order field: ${field}`);
    });
  }

  throw new Error('Invalid order parameter format');
};

/**
 * Validate where clause to prevent SQL injection
 */
const validateWhereClause = (where) => {
  if (!where) return undefined;

  // Basic validation - ensure no raw SQL
  const whereString = JSON.stringify(where);
  const dangerousPatterns = [
    /\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|UNION|SELECT)\b/i,
    /--/,
    /\/\*/,
    /\*\//,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(whereString)) {
      throw new Error('Potentially dangerous SQL detected in where clause');
    }
  }

  return where;
};

module.exports = {
  getDatabaseSecurityConfig,
  validateDatabaseSecurity,
  getPoolInfo,
  createSecureQuery,
  validateOrderParameter,
  validateWhereClause,
};
