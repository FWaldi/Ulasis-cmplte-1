const path = require('path');
const { initializeEnvironment } = require('./env-validator');
const { validateEnvironmentSecurity } = require('../config/env-security');

/**
 * Load environment-specific configuration
 */
const loadEnvironmentConfig = function () {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Initialize and validate environment variables
  initializeEnvironment();

  // Perform security validation
  const securityValidation = validateEnvironmentSecurity();
  if (!securityValidation.valid) {
    throw new Error(
      `Environment security validation failed: ${securityValidation.errors.join(', ')}`,
    );
  }

  // Load environment-specific configuration
  let config;
  try {
    switch (nodeEnv) {
      case 'production':
        config = require('../config/environments/production');
        break;
      case 'test':
        config = require('../config/environments/test');
        break;
      case 'staging':
        config = require('../config/environments/staging');
        break;
      case 'development':
      default:
        config = require('../config/environments/development');
        break;
    }
  } catch (error) {
    throw new Error(`Failed to load configuration for environment '${nodeEnv}': ${error.message}`);
  }

  // Add environment metadata
  config.environment = {
    name: nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    isDevelopment: nodeEnv === 'development',
    isStaging: nodeEnv === 'staging',
  };

  // Add path configurations
  config.paths = {
    root: path.resolve(__dirname, '../..'),
    src: path.resolve(__dirname, '..'),
    uploads: path.resolve(__dirname, '../../uploads'),
    logs: path.resolve(__dirname, '../../logs'),
    migrations: path.resolve(__dirname, '../../migrations'),
    tests: path.resolve(__dirname, '../../tests'),
  };

  return config;
};

/**
 * Get environment-specific database configuration
 */
const getDatabaseConfig = function () {
  const config = loadEnvironmentConfig();
  return config.database;
};

/**
 * Get environment-specific server configuration
 */
const getServerConfig = function () {
  const config = loadEnvironmentConfig();
  return config.server;
};

/**
 * Get environment-specific security configuration
 */
const getSecurityConfig = function () {
  const config = loadEnvironmentConfig();
  return config.security;
};

/**
 * Check if current environment is production
 */
const isProduction = function () {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if current environment is test
 */
const isTest = function () {
  return process.env.NODE_ENV === 'test';
};

/**
 * Check if current environment is development
 */
const isDevelopment = function () {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
};

/**
 * Get feature flags for current environment
 */
const getFeatureFlags = function () {
  const config = loadEnvironmentConfig();
  return {
    emailEnabled: !!config.email?.user && !!config.email?.pass,
    rateLimitingEnabled: config.rateLimit?.max < 10000,
    fileUploadEnabled: !!config.upload,
    loggingEnabled: config.logging?.level !== 'none',
    monitoringEnabled: !!config.monitoring?.enabled,
    documentationEnabled: !!config.api?.documentation,
    swaggerEnabled: !!config.api?.swaggerEnabled,
    cachingEnabled: !!config.production?.caching,
    cdnEnabled: !!config.production?.cdn,
    clusterModeEnabled: !!config.production?.clusterMode,
  };
};

module.exports = {
  loadEnvironmentConfig,
  getDatabaseConfig,
  getServerConfig,
  getSecurityConfig,
  isProduction,
  isTest,
  isDevelopment,
  getFeatureFlags,
};
