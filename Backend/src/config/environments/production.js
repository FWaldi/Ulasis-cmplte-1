const productionConfig = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    dialect: 'mysql',
    timezone: process.env.DB_TIMEZONE || '+00:00',

    // Production connection pool (optimized for performance)
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 5,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
      evict: 1000,
    },

    // Production logging (minimal)
    logging: false,

    // Production dialect options with security
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      ssl:
        process.env.DB_SSL === 'true'
          ? {
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
            ca: process.env.DB_SSL_CA,
            key: process.env.DB_SSL_KEY,
            cert: process.env.DB_SSL_CERT,
          }
          : false,
      connectTimeout: 10000,
      acquireTimeout: 60000,
      timeout: 60000,
    },

    // Production retry configuration
    retry: {
      max: 10,
      timeout: 10000,
    },
  },

  // Security Configuration (strict for production)
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
    sessionSecret: process.env.SESSION_SECRET, // Required
    jwtSecret: process.env.JWT_SECRET, // Required
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    },
  },

  // CORS Configuration (restrictive for production)
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  },

  // Rate Limiting (strict for production)
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // Logging Configuration (optimized for production)
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/production.log',
    maxSize: process.env.LOG_MAX_SIZE || '50m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 30,
    console: false,
    colorize: false,
    json: true,
  },

  // Email Configuration (required for production)
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER, // Required
      pass: process.env.EMAIL_PASS, // Required
    },
    from: process.env.EMAIL_FROM || 'noreply@ulasis.com',
    queue: true,
    sendgrid: process.env.EMAIL_SERVICE === 'sendgrid',
  },

  // File Upload Configuration
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    destination: process.env.UPLOAD_DESTINATION || 'uploads/',
    virusScan: true,
    cloudStorage: process.env.CLOUD_STORAGE === 'true',
  },

  // API Configuration
  api: {
    version: 'v1',
    prefix: '/api/v1',
    rateLimitStrict: process.env.RATE_LIMIT_STRICT === 'true',
    documentation: false,
    swaggerEnabled: false,
    requestTimeout: 30000,
  },

  // Monitoring and Analytics
  monitoring: {
    enabled: true,
    metrics: true,
    healthCheck: true,
    performanceMonitoring: true,
    errorTracking: true,
    apm: process.env.APM_SERVICE === 'true',
  },

  // Backup and Recovery
  backup: {
    enabled: true,
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retention: parseInt(process.env.BACKUP_RETENTION) || 30, // 30 days
    compression: true,
    encryption: true,
  },

  // Production-specific features
  production: {
    clusterMode: process.env.CLUSTER_MODE === 'true',
    gracefulShutdown: true,
    healthChecks: true,
    caching: process.env.CACHING_ENABLED === 'true',
    cdn: process.env.CDN_ENABLED === 'true',
  },
};

module.exports = productionConfig;
