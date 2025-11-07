const Joi = require('joi');
const logger = require('./logger');

/**
 * Environment Variable Validation Schema
 */
const envSchema = Joi.object({
  // Server Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  // CORS Configuration
  CORS_ORIGIN: Joi.string().uri().default('http://localhost:5173'),

  // Database Configuration
  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().port().default(3306),
  DB_NAME: Joi.string().min(1).max(64).required(),
  DB_USER: Joi.string().min(1).max(64).required(),
  DB_PASS: Joi.string().allow(''),
  DB_SSL: Joi.boolean().default(false),
  DB_SSL_REJECT_UNAUTHORIZED: Joi.boolean().default(true),
  DB_TIMEZONE: Joi.string().default('+00:00'),
  DB_CHARSET: Joi.string().default('utf8mb4'),
  DB_COLLATE: Joi.string().default('utf8mb4_unicode_ci'),

  // Database Connection Pool
  DB_POOL_MAX: Joi.number().integer().min(1).max(100).default(10),
  DB_POOL_MIN: Joi.number().integer().min(0).max(50).default(0),
  DB_POOL_ACQUIRE: Joi.number().integer().min(1000).max(300000).default(30000),
  DB_POOL_IDLE: Joi.number().integer().min(1000).max(300000).default(10000),

  // JWT Configuration
  JWT_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Session Configuration
  SESSION_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Email Configuration
  EMAIL_HOST: Joi.string().hostname().default('smtp.gmail.com'),
  EMAIL_PORT: Joi.number().port().default(587),
  EMAIL_SECURE: Joi.boolean().default(false),
  EMAIL_USER: Joi.string().email().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  EMAIL_PASS: Joi.string().when('EMAIL_USER', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  EMAIL_FROM: Joi.string().email().default('noreply@ulasis.com'),

  // Security Configuration
  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
  PASSWORD_MIN_LENGTH: Joi.number().integer().min(6).max(128).default(8),

  // Rate Limiting
  RATE_LIMIT_MAX: Joi.number().integer().min(1).max(10000).default(100),
  RATE_LIMIT_STRICT: Joi.boolean().default(false),

  // File Upload Configuration
  UPLOAD_MAX_SIZE: Joi.number()
    .integer()
    .min(1024)
    .max(104857600) // 100MB max
    .default(5242880), // 5MB default
  UPLOAD_DESTINATION: Joi.string().default('uploads/'),

  // Logging Configuration
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE: Joi.string().default('logs/app.log'),
  LOG_MAX_SIZE: Joi.string().default('20m'),
  LOG_MAX_FILES: Joi.number().integer().min(1).max(365).default(14),

  // Test Database Configuration (optional)
  DB_HOST_TEST: Joi.string().hostname().optional(),
  DB_PORT_TEST: Joi.number().port().optional(),
  DB_NAME_TEST: Joi.string().min(1).max(64).optional(),
  DB_USER_TEST: Joi.string().min(1).max(64).optional(),
  DB_PASS_TEST: Joi.string().allow('').optional(),

  // Staging Database Configuration (optional)
  DB_NAME_STAGING: Joi.string().min(1).max(64).optional(),
}).unknown(true); // Allow unknown environment variables

/**
 * Validate environment variables
 */
const validateEnvironment = function () {
  const { error, value: validatedEnv } = envSchema.validate(process.env, {
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const errorMessage = `Environment validation failed: ${error.details
      .map((detail) => detail.message)
      .join(', ')}`;

    logger.error('Environment validation failed:', {
      error: errorMessage,
      details: error.details,
    });

    throw new Error(errorMessage);
  }

  // Log successful validation (only in non-production)
  if (validatedEnv.NODE_ENV !== 'production') {
    logger.info('Environment variables validated successfully', {
      environment: validatedEnv.NODE_ENV,
      database: {
        host: validatedEnv.DB_HOST,
        port: validatedEnv.DB_PORT,
        database: validatedEnv.DB_NAME,
      },
      server: {
        port: validatedEnv.PORT,
        corsOrigin: validatedEnv.CORS_ORIGIN,
      },
    });
  }

  return validatedEnv;
};

/**
 * Check for deprecated environment variables
 */
const checkDeprecatedVariables = function () {
  const deprecatedVars = ['OLD_VAR_NAME', 'DEPRECATED_SETTING'];

  const foundDeprecated = deprecatedVars.filter((varName) => process.env[varName]);

  if (foundDeprecated.length > 0) {
    logger.warn('Deprecated environment variables found:', {
      deprecated: foundDeprecated,
      message: 'Please remove these variables and use the new configuration',
    });
  }
};

/**
 * Validate environment-specific requirements
 */
const validateEnvironmentSpecific = function (env) {
  const warnings = [];

  switch (env.NODE_ENV) {
    case 'production':
      // Production-specific validations
      if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters in production');
      }
      if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
        throw new Error('SESSION_SECRET must be at least 32 characters in production');
      }
      if (!env.EMAIL_USER || !env.EMAIL_PASS) {
        warnings.push('Email configuration is recommended in production');
      }
      break;

    case 'test':
      // Test-specific validations
      if (!env.DB_NAME_TEST) {
        warnings.push('Test database name not configured, using test database');
      }
      break;

    case 'development':
      // Development-specific validations
      if (env.DB_PASS === '') {
        warnings.push('Database password is empty in development');
      }
      break;
  }

  if (warnings.length > 0) {
    logger.warn('Environment-specific warnings:', { warnings });
  }
};

/**
 * Main environment validation function
 */
const initializeEnvironment = function () {
  try {
    logger.info('Validating environment configuration...');

    // Check for deprecated variables
    checkDeprecatedVariables();

    // Validate environment variables
    const validatedEnv = validateEnvironment();

    // Environment-specific validations
    validateEnvironmentSpecific(validatedEnv);

    // Set validated environment variables back to process.env
    Object.assign(process.env, validatedEnv);

    logger.info('Environment configuration validated and initialized', {
      environment: validatedEnv.NODE_ENV,
    });

    return validatedEnv;
  } catch (error) {
    logger.error('Failed to initialize environment configuration:', error);
    throw error;
  }
};

module.exports = {
  validateEnvironment,
  checkDeprecatedVariables,
  validateEnvironmentSpecific,
  initializeEnvironment,
  envSchema,
};
