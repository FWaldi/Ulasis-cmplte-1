const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import configurations
const config = require('./config/app');
const logger = require('./utils/logger');
const { initialize: connectDatabase } = require('./config/database');

// Import routes
const analyticsRoutes = require('./routes/analytics');
const reviewAnalyticsRoutes = require('./routes/reviewAnalytics');
const reviewsRoutes = require('./routes/reviews');
const subscriptionRoutes = require('./routes/subscription');
const questionnaireRoutes = require('./routes/questionnaires');
const healthRoutes = require('./routes/health');

// Create Express app
const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware
app.use(compression());

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Rate limiting (disabled in test environment)
if (config.nodeEnv !== 'test') {
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads/'));

// Health check endpoint (no rate limiting)
app.use('/api/v1/health', healthRoutes);

// API routes
app.use('/api/analytics', analyticsRoutes); // Frontend calls /api/analytics (without v1)
app.use('/api/v1/analytics', reviewAnalyticsRoutes);
app.use('/api/subscription', subscriptionRoutes); // Frontend calls /api/subscription (without v1)
app.use('/api/v1/questionnaires', questionnaireRoutes);
app.use('/api/v1/reviews', reviewsRoutes);

  // 404 handler
  app.use('*', (req, res) => {
    console.log('DEBUG: 404 handler called for:', req.method, req.originalUrl);
    require('fs').appendFileSync('debug.log', `404: ${req.method} ${req.originalUrl}\n`);
    res.status(404).json({
      success: false,
      error: 'Route not found',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      timestamp: new Date().toISOString()
    });
  });

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const message = config.env === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(err.status || 500).json({
    success: false,
    error: 'Internal server error',
    message,
    timestamp: new Date().toISOString(),
    ...(config.env !== 'production' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await connectDatabase();
    logger.info('Database connected successfully');

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
      logger.info(`Health check available at http://localhost:${config.port}/api/v1/health`);
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
      } else {
        logger.error('Server error:', err);
      }
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;