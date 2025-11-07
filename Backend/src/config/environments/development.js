const developmentConfig = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'ulasis_dev',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    dialect: 'mysql',
    timezone: '+00:00',

    // Development connection pool (smaller)
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },

    // Development logging
    logging: require('../../utils/logger').info,

    // Development dialect options
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      ssl: false,
    },
  },

  // Security Configuration (relaxed for development)
  security: {
    bcryptRounds: 10, // Faster for development
    passwordMinLength: 6,
    sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production-min-32-chars',
  },

  // CORS Configuration (permissive for development)
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  // Rate Limiting (relaxed for development)
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Much higher limit for development
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
    },
    skipSuccessfulRequests: false,
  },

  // Logging Configuration (verbose for development)
  logging: {
    level: 'debug',
    file: 'logs/development.log',
    maxSize: '20m',
    maxFiles: 7,
    console: true,
    colorize: true,
  },

  // Email Configuration (optional for development)
  email: {
    host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
    port: process.env.EMAIL_PORT || 2525,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    },
    from: process.env.EMAIL_FROM || 'dev@ulasis.local',
  },

  // File Upload Configuration
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB for development
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    destination: 'uploads/dev/',
  },

  // API Configuration
  api: {
    version: 'v1',
    prefix: '/api/v1',
    rateLimitStrict: false,
    documentation: true,
    swaggerEnabled: true,
  },

  // Development-specific features
  development: {
    hotReload: true,
    debugMode: true,
    mockData: true,
    detailedErrors: true,
    sqlLogging: true,
    requestLogging: true,
  },
};

module.exports = developmentConfig;
