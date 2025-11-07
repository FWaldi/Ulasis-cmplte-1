const winston = require('winston');
const path = require('path');
const fs = require('fs');
const appConfig = require('../config/app');

// Ensure logs directory exists
try {
  const logsDir = path.dirname(appConfig.logging.file);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  console.warn('Could not create logs directory:', error.message);
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  }),
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Create logger instance
const logger = winston.createLogger({
  level: appConfig.logging.level,
  format: fileFormat,
  defaultMeta: { service: 'ulasis-backend' },
  transports: [
    // Temporarily disable file transports to debug startup issue
    // // File transport for all logs
    // new winston.transports.File({
    //   filename: appConfig.logging.file,
    //   maxsize: appConfig.logging.maxSize,
    //   maxFiles: appConfig.logging.maxFiles,
    //   tailable: true,
    // }),

    // // Separate file for errors
    // new winston.transports.File({
    //   filename: path.join(logsDir, 'error.log'),
    //   level: 'error',
    //   maxsize: appConfig.logging.maxSize,
    //   maxFiles: appConfig.logging.maxFiles,
    //   tailable: true,
    // }),
  ],

  // Handle exceptions and rejections
  // exceptionHandlers: [
  //   new winston.transports.File({
  //     filename: path.join(logsDir, 'exceptions.log'),
  //     maxsize: appConfig.logging.maxSize,
  //     maxFiles: appConfig.logging.maxFiles,
  //   }),
  // ],

  // rejectionHandlers: [
  //   new winston.transports.File({
  //     filename: path.join(logsDir, 'rejections.log'),
  //     maxsize: appConfig.logging.maxSize,
  //     maxFiles: appConfig.logging.maxFiles,
  //   }),
  // ],
});

// Add console transport for non-production environments
if (appConfig.nodeEnv !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
}

// Add console transport for test environment with minimal output
if (appConfig.nodeEnv === 'test') {
  logger.transports.forEach((transport) => {
    if (transport.name !== 'console') {
      transport.silent = true;
    }
  });

  logger.add(
    new winston.transports.Console({
      level: 'warn', // Only show warnings and errors during tests
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}]: ${message}`;
        }),
      ),
    }),
  );
}

// Helper methods for structured logging
logger.logRequest = (req, res, responseTime) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });
};

logger.logError = (error, req = null) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  };

  if (req) {
    errorData.request = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
    };
  }

  logger.error('Application Error', errorData);
};

logger.logDatabase = (operation, table, data = {}) => {
  logger.debug('Database Operation', {
    operation,
    table,
    data,
    timestamp: new Date().toISOString(),
  });
};

logger.logSecurity = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};

module.exports = logger;
