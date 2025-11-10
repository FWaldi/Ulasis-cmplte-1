// Load environment variables first
require('dotenv').config();
console.log('Environment loaded');

const express = require('express');
console.log('Express loaded');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
require('express-async-errors');

// Import configurations
console.log('Loading configs...');
// const appConfig = require('./config/app'); // Not used
console.log('App config loaded');
const databaseConfig = require('./config/database');
console.log('Database config loaded');
const { setupSwagger } = require('./config/swagger');
console.log('Swagger config loaded');
const logger = require('./utils/logger');
console.log('Logger loaded');

// Import error handlers
console.log('Loading error handlers...');
const { globalErrorHandler, notFoundHandler } = require('./utils/errorHandler');
console.log('Error handlers loaded');

// Import security middleware
console.log('Loading security middleware...');
const {
  helmetConfig,
  rateLimiters,
  securityHeaders,
} = require('./middleware/security');

console.log('Security middleware loaded');

// Import monitoring middleware
console.log('Loading monitoring middleware...');
const {
  requestMonitor,
  errorMonitor,
  ipBlocker,
  businessMetrics,
  enhancedHealthCheck,
  metricsEndpoint,
} = require('./middleware/monitoring');

// Import models
console.log('Requiring models...');
const { initialize: initializeModels } = require('./models');
console.log('Models required successfully');

// Import routes
console.log('Loading routes...');
console.log('Loading health routes...');
const healthRoutes = require('./routes/health');
console.log('Health routes loaded');
console.log('Loading auth routes...');
const authRoutes = require('./routes/auth');
console.log('Auth routes loaded');
console.log('Loading admin routes...');
const adminRoutes = require('./routes/admin');
console.log('Admin routes loaded');
console.log('Loading enterprise admin routes...');
const enterpriseAdminRoutes = require('./routes/enterpriseAdmin');
console.log('Enterprise admin routes loaded');
console.log('Loading questionnaire routes...');
const questionnaireRoutes = require('./routes/questionnaires');
console.log('Questionnaire routes loaded');
console.log('Loading qr code routes...');
const qrCodeRoutes = require('./routes/qr-codes');
console.log('QR code routes loaded');
console.log('Loading question routes...');
const questionRoutes = require('./routes/questions');
console.log('Question routes loaded');
console.log('Loading response routes...');
const responseRoutes = require('./routes/responses');
console.log('Response routes loaded');
console.log('Loading analytics routes...');
const analyticsRoutes = require('./routes/analytics');
console.log('Analytics routes loaded');
console.log('Loading subscription routes...');
const subscriptionRoutes = require('./routes/subscription');
console.log('Subscription routes loaded');
console.log('Loading notification routes...');
const notificationRoutes = require('./routes/notifications');
console.log('Notification routes loaded');
console.log('All routes loaded');

// Import scheduled jobs
const privacyCleanupJob = require('./jobs/privacyCleanupJob');

// Create Express application
const app = express();

// Trust proxy for rate limiting and security headers
app.set('trust proxy', 1);

// Security middleware
app.use(helmetConfig);
app.use(securityHeaders);
// app.use(requestSizeLimiter('10mb'));

// CORS configuration (must be before rate limiting)
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003',
      'http://127.0.0.1:5173',
    ], // Allow specific origins for development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Apply general rate limiting to all API routes
app.use('/api/', rateLimiters.general);

// Monitoring middleware
app.use(requestMonitor);
app.use(ipBlocker);
app.use(businessMetrics);

// Compression middleware
app.use(compression());

// Request logging
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (before other routes)
app.use('/api/v1/health', healthRoutes);

// Enhanced health check endpoint
app.get('/api/v1/health/enhanced', enhancedHealthCheck);

// Metrics endpoint
app.get('/api/v1/metrics', metricsEndpoint);

// Authentication routes
app.use('/api/v1/auth', authRoutes);

// Admin routes
app.use('/api/v1/admin', adminRoutes);

// Enterprise Admin routes (completely separate from regular admin)
app.use('/api/v1/enterprise-admin', enterpriseAdminRoutes);

// Questionnaire routes
app.use('/api/v1/questionnaires', questionnaireRoutes);

// QR code routes
app.use('/api/v1/qr-codes', qrCodeRoutes);

// Question routes
app.use('/api/v1/questions', questionRoutes);

// Response routes (anonymous)
app.use('/api/v1/responses', responseRoutes);

// Analytics routes (authenticated)
app.use('/api/v1/analytics', analyticsRoutes);

// Subscription routes (authenticated)
app.use('/api/v1/subscription', subscriptionRoutes);

// Notification routes (authenticated)
app.use('/api/v1/notifications', notificationRoutes);

// Serve uploaded files
app.use('/api/v1/uploads', express.static('uploads'));

// API routes (catch-all for /api/v1 exactly - must be AFTER all specific routes)
app.use('/api/v1', (req, res, next) => {
  // Only handle exact /api/v1 match
  if (req.path !== '/' && req.path !== '') {
    return next();
  }

  res.json({
    message: 'Ulasis Backend API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

// Error monitoring middleware
app.use(errorMonitor);

// 404 handler
app.use('*', notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Initialize models
const initializeAppModels = async () => {
  try {
    await initializeModels();
    logger.info('Application models initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application models:', error);
    throw error;
  }
};

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close database connection
  databaseConfig
    .close()
    .then(() => {
      logger.info('Database connection closed.');
      process.exit(0); // eslint-disable-line no-process-exit
    })
    .catch((error) => {
      logger.error('Error during database shutdown:', error);
      process.exit(1); // eslint-disable-line no-process-exit
    });
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1); // eslint-disable-line no-process-exit
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1); // eslint-disable-line no-process-exit
});

// Initialize models and start server
const startServer = async () => {
  try {
    // Initialize models
    await initializeAppModels();

    // Setup Swagger documentation
    setupSwagger(app);

    // Start scheduled jobs
    privacyCleanupJob.start();
    logger.info('Scheduled jobs initialized');

    // Get port from environment
    const PORT = process.env.PORT || 3000;

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Ulasis Backend Server running on port ${PORT}`);
      logger.info(`📊 Health check available at: http://localhost:${PORT}/api/v1/health`);
      logger.info(`🔐 Auth endpoints available at: http://localhost:${PORT}/api/v1/auth`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
      logger.info('🌐 Server bound to all interfaces');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          throw new Error(`${bind} requires elevated privileges`);
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          throw new Error(`${bind} is already in use`);
        default:
          throw error;
      }
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(() => {
        logger.info('HTTP server closed.');

        // Close database connection
        databaseConfig
          .close()
          .then(() => {
            logger.info('Database connection closed.');
            process.exit(0); // eslint-disable-line no-process-exit
          })
          .catch((error) => {
            logger.error('Error during database shutdown:', error);
            process.exit(1); // eslint-disable-line no-process-exit
          });
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1); // eslint-disable-line no-process-exit
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
