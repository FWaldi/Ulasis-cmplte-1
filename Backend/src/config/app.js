require('dotenv').config();

const appConfig = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
    },
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Email configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    from: process.env.EMAIL_FROM || 'noreply@ulasis.com',
  },

  // File upload configuration
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    destination: process.env.UPLOAD_DESTINATION || 'uploads/',
  },

  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 14,
  },

  // API configuration
  api: {
    version: 'v1',
    prefix: '/api/v1',
    rateLimitStrict: process.env.RATE_LIMIT_STRICT === 'true',
  },

  // Database configuration (connection details are in database.js)
  database: {
    timezone: process.env.DB_TIMEZONE || '+00:00',
    charset: process.env.DB_CHARSET || 'utf8mb4',
    collate: process.env.DB_COLLATE || 'utf8mb4_unicode_ci',
  },
};

// Validation
const requiredEnvVars = [];

if (appConfig.nodeEnv === 'production') {
  requiredEnvVars.push('JWT_SECRET', 'SESSION_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS');
}

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

module.exports = appConfig;
