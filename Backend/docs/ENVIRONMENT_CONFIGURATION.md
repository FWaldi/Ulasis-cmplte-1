# Environment Configuration Guide

This guide explains how to configure the Ulasis backend for different environments (development, test, staging, production).

## 📋 Overview

The application uses environment variables for configuration across different deployment environments. Each environment has specific settings optimized for its use case.

## 🗂️ Environment Files

### `.env.example`

Template file showing all available environment variables. Copy this to `.env` and modify as needed.

### `.env`

Local environment file (never commit to version control). Contains sensitive information like database credentials and API keys.

### Environment-Specific Configs

Located in `src/config/environments/`:
- `development.js` - Development environment settings
- `test.js` - Test environment settings  
- `staging.js` - Staging environment settings
- `production.js` - Production environment settings

## 🔧 Environment Variables

### Server Configuration

```env
# Application environment
NODE_ENV=development|test|staging|production

# Server port
PORT=3000

# CORS allowed origins (comma-separated)
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### Database Configuration

```env
# Database connection
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ulasis
DB_USER=username
DB_PASS=password

# Database SSL
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true

# Database timezone and charset
DB_TIMEZONE=+00:00
DB_CHARSET=utf8mb4
DB_COLLATE=utf8mb4_unicode_ci

# Connection pool settings
DB_POOL_MAX=10
DB_POOL_MIN=0
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000
```

### Test Database (Optional)

```env
DB_HOST_TEST=localhost
DB_PORT_TEST=3306
DB_NAME_TEST=ulasis_test
DB_USER_TEST=test_user
DB_PASS_TEST=test_password
```

### Security Configuration

```env
# JWT settings
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Session settings
SESSION_SECRET=your-session-secret-min-32-characters

# Password settings
BCRYPT_ROUNDS=12
PASSWORD_MIN_LENGTH=8
```

### Email Configuration

```env
# SMTP settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@ulasis.com
```

### Rate Limiting

```env
# Rate limiting settings
RATE_LIMIT_MAX=100
RATE_LIMIT_STRICT=false
```

### File Upload

```env
# Upload settings
UPLOAD_MAX_SIZE=5242880
UPLOAD_DESTINATION=uploads/
```

### Logging

```env
# Logging configuration
LOG_LEVEL=info|debug|warn|error
LOG_FILE=logs/app.log
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14
```

## 🌍 Environment-Specific Settings

### Development Environment

**Purpose**: Local development and testing

**Characteristics**:
- Verbose logging with console output
- Relaxed security settings
- Hot reload enabled
- Mock services for external dependencies
- Detailed error messages
- SQL query logging

**Key Settings**:
```env
NODE_ENV=development
LOG_LEVEL=debug
BCRYPT_ROUNDS=10
RATE_LIMIT_MAX=1000
```

**Features**:
- Database query logging
- Request/response logging
- Swagger documentation enabled
- CORS allows all local origins
- File uploads to local storage

### Test Environment

**Purpose**: Automated testing and CI/CD

**Characteristics**:
- Isolated test database
- Minimal logging
- Mock external services
- Fast password hashing
- No rate limiting
- In-memory file storage

**Key Settings**:
```env
NODE_ENV=test
LOG_LEVEL=error
BCRYPT_ROUNDS=4
RATE_LIMIT_MAX=10000
DB_NAME_TEST=ulasis_test
```

**Features**:
- Database reset between tests
- Mock email service
- Memory-based file uploads
- No authentication required for tests
- Fast test execution

### Staging Environment

**Purpose**: Pre-production testing

**Characteristics**:
- Production-like configuration
- Staging database
- Real external services (sandbox)
- Comprehensive logging
- Security features enabled

**Key Settings**:
```env
NODE_ENV=staging
LOG_LEVEL=info
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=200
```

**Features**:
- Production security settings
- Real email service (sandbox)
- File uploads to cloud storage
- Monitoring and alerting
- Performance tracking

### Production Environment

**Purpose**: Live production deployment

**Characteristics**:
- Maximum security
- Optimized performance
- Minimal logging
- Error tracking
- Monitoring enabled

**Key Settings**:
```env
NODE_ENV=production
LOG_LEVEL=warn
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=100
```

**Features**:
- SSL/TLS encryption
- Rate limiting enforced
- Security headers
- Error monitoring
- Performance monitoring
- Backup automation

## 🔐 Security Considerations

### Required Production Variables

These variables are **required** in production:

```env
NODE_ENV=production
JWT_SECRET (minimum 32 characters)
SESSION_SECRET (minimum 32 characters)
DB_HOST
DB_NAME
DB_USER
DB_PASS
```

### Sensitive Variables

Never commit these to version control:

```env
DB_PASS
JWT_SECRET
SESSION_SECRET
EMAIL_PASS
API_KEYS
```

### Environment Validation

The application validates environment variables on startup:

- Checks required variables are present
- Validates variable formats and ranges
- Provides clear error messages
- Logs warnings for deprecated variables

## 🚀 Setup Instructions

### 1. Development Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### 2. Test Setup

```bash
# Set test environment
export NODE_ENV=test

# Create test database
mysql -u root -p -e "CREATE DATABASE ulasis_test;"

# Run tests
npm test
```

### 3. Production Setup

```bash
# Set production environment
export NODE_ENV=production

# Set required secrets
export JWT_SECRET="your-production-jwt-secret-32-chars"
export SESSION_SECRET="your-production-session-secret-32-chars"

# Configure database
export DB_HOST="your-production-db-host"
export DB_NAME="your-production-db"
export DB_USER="your-production-user"
export DB_PASS="your-production-password"

# Install dependencies
npm ci --production

# Run database migrations
npm run migrate

# Start production server
npm start
```

## 🔍 Environment Validation

### Validation Schema

The application uses Joi for environment variable validation:

```javascript
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'staging', 'production'),
  PORT: Joi.number().port(),
  DB_HOST: Joi.string().hostname().required(),
  JWT_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
  }),
  // ... more validations
});
```

### Validation Process

1. Load environment variables from `.env` file
2. Validate against schema
3. Convert types (string to number, boolean, etc.)
4. Check environment-specific requirements
5. Log validation results
6. Exit on validation errors

### Common Validation Errors

```bash
# Missing required variable
Environment validation failed: "DB_HOST" is required

# Invalid value
Environment validation failed: "NODE_ENV" must be one of [development, test, staging, production]

# Production security requirements
Environment validation failed: JWT_SECRET must be at least 32 characters in production
```

## 📊 Configuration Loading

### Load Order

1. Default values in code
2. `.env` file variables
3. System environment variables
4. Command line arguments
5. Validation and type conversion

### Environment Detection

```javascript
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const isDevelopment = process.env.NODE_ENV === 'development';
```

### Feature Flags

Environment-specific features are controlled by configuration:

```javascript
const features = {
  emailEnabled: !!config.email?.user,
  rateLimitingEnabled: config.rateLimit?.max < 10000,
  documentationEnabled: config.api?.documentation,
  monitoringEnabled: config.monitoring?.enabled,
};
```

## 🛠️ Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solution**: Check database server is running and credentials are correct.

#### JWT Secret Too Short

```bash
Error: JWT_SECRET must be at least 32 characters in production
```

**Solution**: Generate a secure 32+ character secret.

#### Environment Variable Not Found

```bash
Error: DB_HOST is required
```

**Solution**: Add missing variable to `.env` file or system environment.

### Debug Mode

Enable debug logging to troubleshoot configuration issues:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

### Validation Debugging

Test environment validation:

```bash
node -e "require('./src/utils/env-validator').initializeEnvironment()"
```

## 📚 Additional Resources

- [Environment Variables Best Practices](https://12factor.net/config)
- [Node.js Environment Configuration](https://nodejs.org/api/process.html#process_process_env)
- [Joi Validation Library](https://joi.dev/)
- [Security Best Practices](./SECURITY.md)

---

For more information, see the [main documentation](../README.md).