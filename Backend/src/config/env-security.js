const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Environment Variable Security Validation
 *
 * This module validates and secures environment variables to ensure
 * proper configuration and prevent security vulnerabilities.
 */

/**
 * Validate required environment variables
 */
const validateRequiredEnvVars = () => {
  const requiredVars = {
    // Database configuration
    DB_HOST: {
      required: true,
      type: 'string',
      description: 'Database host address',
    },
    DB_NAME: {
      required: true,
      type: 'string',
      description: 'Database name',
    },
    DB_USER: {
      required: true,
      type: 'string',
      description: 'Database username',
    },
    DB_PASSWORD: {
      required: true,
      type: 'string',
      sensitive: true,
      description: 'Database password',
    },
    DB_PORT: {
      required: false,
      type: 'number',
      default: 3306,
      description: 'Database port',
    },

    // SSL Configuration
    DB_SSL_REQUIRE: {
      required: false,
      type: 'boolean',
      default: false,
      description: 'Require SSL for database connections',
    },
    DB_SSL_REJECT_UNAUTHORIZED: {
      required: false,
      type: 'boolean',
      default: true,
      description: 'Reject unauthorized SSL certificates',
    },

    // Application Configuration
    NODE_ENV: {
      required: false,
      type: 'string',
      allowed: ['development', 'test', 'staging', 'production'],
      default: 'development',
      description: 'Application environment',
    },
    PORT: {
      required: false,
      type: 'number',
      default: 3000,
      description: 'Application port',
    },

    // Security Configuration
    JWT_SECRET: {
      required: true,
      type: 'string',
      minLength: 32,
      sensitive: true,
      description: 'JWT signing secret (minimum 32 characters)',
    },
    JWT_EXPIRES_IN: {
      required: false,
      type: 'string',
      default: '24h',
      description: 'JWT expiration time',
    },
    BCRYPT_ROUNDS: {
      required: false,
      type: 'number',
      default: 12,
      min: 10,
      max: 15,
      description: 'Bcrypt password hashing rounds',
    },

    // CORS Configuration
    CORS_ORIGIN: {
      required: false,
      type: 'string',
      default: '*',
      description: 'CORS allowed origins',
    },

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: {
      required: false,
      type: 'number',
      default: 900000,
      description: 'Rate limit window in milliseconds',
    },
    RATE_LIMIT_MAX_REQUESTS: {
      required: false,
      type: 'number',
      default: 100,
      description: 'Maximum requests per rate limit window',
    },

    // Logging Configuration
    LOG_LEVEL: {
      required: false,
      type: 'string',
      allowed: ['error', 'warn', 'info', 'debug'],
      default: 'info',
      description: 'Logging level',
    },

    // Connection Pool Configuration
    DB_POOL_MAX: {
      required: false,
      type: 'number',
      default: 10,
      min: 1,
      max: 100,
      description: 'Maximum database connection pool size',
    },
    DB_POOL_MIN: {
      required: false,
      type: 'number',
      default: 0,
      min: 0,
      description: 'Minimum database connection pool size',
    },
    DB_POOL_ACQUIRE: {
      required: false,
      type: 'number',
      default: 30000,
      min: 5000,
      description: 'Database connection acquire timeout (ms)',
    },
    DB_POOL_IDLE: {
      required: false,
      type: 'number',
      default: 10000,
      min: 1000,
      description: 'Database connection idle timeout (ms)',
    },
  };

  const errors = [];
  const warnings = [];
  const config = {};

  // Validate each environment variable
  Object.entries(requiredVars).forEach(([varName, varConfig]) => {
    const value = process.env[varName];
    // const configValue = value || varConfig.default; // Available for future use

    // Check if required variable is missing
    if (varConfig.required && !value) {
      errors.push(`Required environment variable ${varName} is missing: ${varConfig.description}`);
      return;
    }

    // Skip validation if variable is not provided and has a default
    if (!value && varConfig.default !== undefined) {
      config[varName] = varConfig.default;
      return;
    }

    // Type validation
    if (value) {
      switch (varConfig.type) {
        case 'boolean': {
          const boolValue = value.toLowerCase();
          if (!['true', 'false', '1', '0'].includes(boolValue)) {
            errors.push(`Environment variable ${varName} must be a boolean value (true/false)`);
          } else {
            config[varName] = boolValue === 'true' || boolValue === '1';
          }
          break;
        }

        case 'number': {
          const numValue = parseInt(value, 10);
          if (isNaN(numValue)) {
            errors.push(`Environment variable ${varName} must be a number`);
          } else {
            // Check min/max constraints
            if (varConfig.min !== undefined && numValue < varConfig.min) {
              errors.push(`Environment variable ${varName} must be at least ${varConfig.min}`);
            } else if (varConfig.max !== undefined && numValue > varConfig.max) {
              errors.push(`Environment variable ${varName} must be at most ${varConfig.max}`);
            } else {
              config[varName] = numValue;
            }
          }
          break;
        }

        case 'string': {
          // Check allowed values
          if (varConfig.allowed && !varConfig.allowed.includes(value)) {
            errors.push(
              `Environment variable ${varName} must be one of: ${varConfig.allowed.join(', ')}`,
            );
          } else {
            // Check minimum length
            if (varConfig.minLength && value.length < varConfig.minLength) {
              errors.push(
                `Environment variable ${varName} must be at least ${varConfig.minLength} characters long`,
              );
            } else {
              config[varName] = value;
            }
          }
          break;
        }

        default:
          config[varName] = value;
      }
    }
  });

  // Environment-specific security checks
  const nodeEnv = config.NODE_ENV || 'development';

  if (nodeEnv === 'production') {
    // Production security requirements
    if (!config.DB_SSL_REQUIRE) {
      warnings.push('SSL should be required for database connections in production');
    }

    if (config.CORS_ORIGIN === '*') {
      warnings.push('CORS should not be set to "*" in production');
    }

    if (config.JWT_SECRET && config.JWT_SECRET.length < 64) {
      warnings.push('JWT secret should be at least 64 characters in production');
    }

    if (config.BCRYPT_ROUNDS < 12) {
      warnings.push('Bcrypt rounds should be at least 12 in production');
    }
  }

  // Check for weak default values
  const weakDefaults = {
    JWT_SECRET: ['your-secret-key', 'secret', 'password', 'jwt-secret'],
    DB_PASSWORD: ['password', 'root', 'admin', '123456'],
    DB_HOST: ['localhost', '127.0.0.1'],
  };

  Object.entries(weakDefaults).forEach(([varName, weakValues]) => {
    const value = config[varName];
    if (value && weakValues.includes(value.toLowerCase())) {
      warnings.push(`Environment variable ${varName} appears to be using a weak default value`);
    }
  });

  // Log validation results
  if (errors.length > 0) {
    logger.error('Environment variable validation failed:', { errors });
  }

  if (warnings.length > 0) {
    logger.warn('Environment variable security warnings:', { warnings });
  }

  if (errors.length === 0 && warnings.length === 0) {
    logger.info('Environment variable validation passed');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config,
  };
};

/**
 * Generate secure random secrets
 */
const generateSecureSecrets = () => {
  return {
    jwtSecret: crypto.randomBytes(64).toString('hex'),
    sessionSecret: crypto.randomBytes(64).toString('hex'),
    encryptionKey: crypto.randomBytes(32).toString('hex'),
  };
};

/**
 * Validate JWT secret strength
 */
const validateJWTSecret = (secret) => {
  if (!secret) {
    return { valid: false, reason: 'JWT secret is required' };
  }

  if (secret.length < 32) {
    return { valid: false, reason: 'JWT secret must be at least 32 characters long' };
  }

  // Check for common weak secrets
  const weakSecrets = [
    'your-secret-key',
    'secret',
    'password',
    'jwt-secret',
    'change-me',
    'default-secret',
  ];

  if (weakSecrets.includes(secret.toLowerCase())) {
    return { valid: false, reason: 'JWT secret appears to be a weak default value' };
  }

  // Check entropy (basic check)
  const uniqueChars = new Set(secret).size;
  if (uniqueChars < secret.length * 0.3) {
    return { valid: false, reason: 'JWT secret has low entropy (not enough unique characters)' };
  }

  return { valid: true };
};

/**
 * Mask sensitive values for logging
 */
const maskSensitiveValues = (obj, sensitiveKeys = ['password', 'secret', 'key', 'token']) => {
  const masked = { ...obj };

  Object.keys(masked).forEach((key) => {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      const value = masked[key];
      if (typeof value === 'string' && value.length > 4) {
        masked[key] =
          value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
      } else {
        masked[key] = '***MASKED***';
      }
    }
  });

  return masked;
};

/**
 * Check for environment variable injection
 */
const checkEnvInjection = () => {
  const suspiciousPatterns = [
    /\$\{.*\}/, // Shell substitution
    /\$\(.*\)/, // Command substitution
    /`.*`/, // Backtick command substitution
    /&&/, // Command chaining
    /\|\|/, // Command chaining
    />/, // Redirection
    /</, // Redirection
  ];

  const injectionWarnings = [];

  Object.entries(process.env).forEach(([key, value]) => {
    if (typeof value === 'string') {
      suspiciousPatterns.forEach((pattern) => {
        if (pattern.test(value)) {
          injectionWarnings.push(`Suspicious pattern detected in environment variable ${key}`);
        }
      });
    }
  });

  if (injectionWarnings.length > 0) {
    logger.warn('Environment variable injection warnings:', { warnings: injectionWarnings });
  }

  return injectionWarnings;
};

/**
 * Complete environment security validation
 */
const validateEnvironmentSecurity = () => {
  logger.info('Starting environment security validation');

  // Validate required environment variables
  const envValidation = validateRequiredEnvVars();

  // Check for injection attempts
  const injectionWarnings = checkEnvInjection();

  // Validate JWT secret specifically
  const jwtValidation = validateJWTSecret(envValidation.config.JWT_SECRET);

  const allWarnings = [...envValidation.warnings, ...injectionWarnings];
  if (!jwtValidation.valid) {
    allWarnings.push(jwtValidation.reason);
  }

  const result = {
    valid: envValidation.valid && jwtValidation.valid,
    errors: envValidation.errors,
    warnings: allWarnings,
    config: maskSensitiveValues(envValidation.config),
  };

  logger.info('Environment security validation completed', {
    valid: result.valid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
  });

  return result;
};

module.exports = {
  validateRequiredEnvVars,
  generateSecureSecrets,
  validateJWTSecret,
  maskSensitiveValues,
  checkEnvInjection,
  validateEnvironmentSecurity,
};
