'use strict';

/**
 * Email configuration settings
 * Uses environment variables for secure configuration
 */
const emailConfig = {
  // SMTP server settings
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports

  // Authentication
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  // Email sender settings
  from: {
    email: process.env.EMAIL_FROM || 'noreply@ulasis.com',
    name: process.env.EMAIL_FROM_NAME || 'Ulasis Platform',
  },

  // Frontend URL for email links
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Queue settings
  queue: {
    maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY) || 30000, // 30 seconds
    processingInterval: parseInt(process.env.EMAIL_PROCESSING_INTERVAL) || 30000, // 30 seconds
  },

  // Template settings
  templates: {
    path: process.env.EMAIL_TEMPLATES_PATH || './src/templates/email',
  },
};

module.exports = emailConfig;