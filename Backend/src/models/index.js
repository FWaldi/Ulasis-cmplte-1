'use strict';

const Sequelize = require('sequelize');

// Use different database config based on environment
const { sequelize } =
  process.env.NODE_ENV === 'test'
    ? require('../config/database-test')
    : require('../config/database');
const logger = require('../utils/logger');

// Flag to prevent multiple initializations
let isInitialized = false;

const models = {
  User: require('./User')(sequelize, Sequelize.DataTypes),
  Questionnaire: require('./Questionnaire')(sequelize, Sequelize.DataTypes),
  Question: require('./Question')(sequelize, Sequelize.DataTypes),
  QRCode: require('./QRCode')(sequelize, Sequelize.DataTypes),
  Response: require('./Response')(sequelize, Sequelize.DataTypes),
  Answer: require('./Answer')(sequelize, Sequelize.DataTypes),
  Review: require('./Review')(sequelize, Sequelize.DataTypes),
  AuditLog: require('./AuditLog')(sequelize, Sequelize.DataTypes),
  SystemMetric: require('./SystemMetric')(sequelize, Sequelize.DataTypes),
  SubscriptionUsage: require('./SubscriptionUsage')(sequelize, Sequelize.DataTypes),
  PaymentTransaction: require('./PaymentTransaction')(sequelize, Sequelize.DataTypes),
  NotificationPreference: require('./NotificationPreference')(sequelize, Sequelize.DataTypes),
  NotificationHistory: require('./NotificationHistory')(sequelize, Sequelize.DataTypes),
  AnalyticsKPI: require('./AnalyticsKPI')(sequelize, Sequelize.DataTypes),
  AnalyticsTrend: require('./AnalyticsTrend')(sequelize, Sequelize.DataTypes),
  AnalyticsBreakdown: require('./AnalyticsBreakdown')(sequelize, Sequelize.DataTypes),
  SubscriptionRequest: require('./SubscriptionRequest')(sequelize, Sequelize.DataTypes),
  // Enterprise Admin System Models
  AdminRole: require('./AdminRole')(sequelize, Sequelize.DataTypes),
  AdminUser: require('./AdminUser')(sequelize, Sequelize.DataTypes),
  AdminActivity: require('./AdminActivity')(sequelize, Sequelize.DataTypes),
  EnterpriseReport: require('./EnterpriseReport')(sequelize, Sequelize.DataTypes),
};

// Set up model associations
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Database connection and model initialization
const initialize = async () => {
  try {
    // Prevent multiple initializations
    if (isInitialized) {
      return true;
    }

    console.log('Starting database initialization...');
    // Test database connection
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    logger.info('Database connection established successfully');

    // Sync models in test environment
    if (process.env.NODE_ENV === 'test') {
      console.log('Syncing models for test environment...');
      await sequelize.sync({ force: true });
      console.log('Test database models synchronized');
    } else if (process.env.NODE_ENV === 'development') {
      // Sync models (temporarily disabled to avoid backup table conflicts)
      // console.log('Syncing models...');
      // await sequelize.sync({ alter: true });
      // console.log('Database models synchronized');
      // logger.info('Database models synchronized');
    }

    console.log('Models initialized successfully');
    // logger.info('Models initialized successfully');
    isInitialized = true;
    return true;
  } catch (error) {
    console.log('Failed to initialize models:', error);
    logger.error('Failed to initialize models:', error);
    throw error;
  }
};

// Close database connection
const close = async () => {
  try {
    await sequelize.close();
    console.log('Database connection closed successfully');
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  initialize,
  close,
  ...models,
};
