# Ulasis Backend API

The backend API for the Ulasis questionnaire and analytics platform, built with Node.js, Express.js, and MySQL.

## 🚀 Features

- **RESTful API** built with Express.js
- **MySQL Database** with Sequelize ORM
- **Unlimited Data Retention** across all subscription plans
- **Secure Authentication** with JWT tokens
- **Comprehensive Logging** with Winston
- **Rate Limiting** and security middleware
- **Health Monitoring** endpoints
- **Database Migrations** with version control
- **Environment Configuration** for development, staging, and production
- **Comprehensive Testing** with Jest
- **cPanel Deployment** ready

## 📋 Prerequisites

- **Node.js** 18+ (LTS version recommended)
- **MySQL** 8.0+ or MariaDB 10.5+
- **npm** 8+ or **yarn** 1.22+
- **Git** for version control

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Ulasis/Backend
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Using yarn
yarn install
```

### 3. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ulasis
DB_USER=your_username
DB_PASS=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
SESSION_SECRET=your-session-secret-min-32-characters

# Email Configuration (optional for development)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 4. Database Setup

#### Create Database

```sql
CREATE DATABASE ulasis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ulasis_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON ulasis.* TO 'ulasis_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Run Migrations

```bash
# Test database connection first
npm run test:db

# Run database migrations
npm run migrate

# Check migration status
npm run migrate:status
```

### 5. Start the Application

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

## 📁 Project Structure

```
Backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── app.js          # Application configuration
│   │   ├── database.js     # Database configuration
│   │   ├── sequelize-cli.js # Sequelize CLI config
│   │   └── environments/   # Environment-specific configs
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Express middleware
│   ├── models/             # Sequelize models
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic services
│   ├── utils/              # Utility functions
│   │   ├── logger.js       # Winston logger
│   │   ├── env-validator.js # Environment validation
│   │   └── env-loader.js   # Environment loader
│   └── app.js              # Express application entry point
├── tests/                  # Test files
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── fixtures/           # Test fixtures
│   └── setup.js            # Jest setup
├── migrations/             # Database migrations
├── scripts/                # Utility scripts
│   ├── test-db-connection.js
│   ├── run-migrations.js
│   ├── rollback-migration.js
│   └── migration-status.js
├── uploads/                # File upload storage
├── logs/                   # Application logs
├── docs/                   # Documentation
├── .env.example            # Environment template
├── .eslintrc.js            # ESLint configuration
├── .prettierrc.js          # Prettier configuration
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start with nodemon
npm start                # Start production server

# Database
npm run migrate           # Run migrations
npm run migrate:undo      # Rollback last migration
npm run migrate:status    # Check migration status
npm run test:db          # Test database connection

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier

# Database Reset (development only)
npm run db:reset         # Reset and reseed database
```

## 🌐 API Endpoints

### Health Check

- `GET /api/v1/health` - Comprehensive health check
- `GET /api/v1/health/ping` - Simple ping endpoint

### Authentication (Planned)

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh JWT token

### Questionnaires (Planned)

- `GET /api/v1/questionnaires` - List questionnaires
- `POST /api/v1/questionnaires` - Create questionnaire
- `GET /api/v1/questionnaires/:id` - Get questionnaire
- `PUT /api/v1/questionnaires/:id` - Update questionnaire
- `DELETE /api/v1/questionnaires/:id` - Delete questionnaire

### Responses (Planned)

- `GET /api/v1/responses` - List responses
- `POST /api/v1/responses` - Submit response
- `GET /api/v1/responses/:id` - Get response
- `GET /api/v1/responses/questionnaire/:id` - Get responses by questionnaire

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- health.test.js
```

### Test Structure

- **Unit Tests**: Test individual functions and modules
- **Integration Tests**: Test API endpoints and database operations
- **Fixtures**: Test data and mock objects
- **Coverage**: Target 90%+ code coverage

### Writing Tests

```javascript
// Example test
const request = require('supertest');
const app = require('../src/app');

describe('Health Check', () => {
  test('should return healthy status', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .expect(200);
    
    expect(response.body.status).toBe('healthy');
  });
});
```

## 🗄️ Database Schema

The application uses MySQL with the following main tables:

- **users** - User accounts and subscriptions
- **questionnaires** - Survey/questionnaire management
- **questions** - Individual questions within questionnaires
- **qr_codes** - QR code generation and tracking
- **responses** - Anonymous feedback submissions
- **answers** - Individual question responses
- **reviews** - Manual review processing

### Migration System

Database changes are managed through Sequelize migrations:

```bash
# Create new migration
npx sequelize-cli migration:generate --name create-new-table

# Run migrations
npm run migrate

# Rollback migration
npm run migrate:undo
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Rate Limiting** - Prevent API abuse
- **Input Validation** - Validate and sanitize all inputs
- **CORS Protection** - Cross-origin resource sharing configuration
- **Security Headers** - Helmet.js for security headers
- **Password Hashing** - bcrypt for secure password storage
- **SQL Injection Prevention** - Sequelize ORM with parameterized queries

## 📊 Monitoring and Logging

### Logging

The application uses Winston for structured logging:

```javascript
const logger = require('./src/utils/logger');

logger.info('Application started');
logger.error('Database connection failed', { error: err });
logger.warn('Rate limit exceeded', { ip: req.ip });
```

### Health Monitoring

- **Health Endpoints**: `/api/v1/health` and `/api/v1/health/ping`
- **Database Monitoring**: Connection pool status and query performance
- **System Monitoring**: Memory usage, uptime, and system resources
- **Error Tracking**: Comprehensive error logging and reporting

## 🚀 Deployment

### Development Deployment

```bash
# Set environment
export NODE_ENV=development

# Install dependencies
npm install

# Run migrations
npm run migrate

# Start application
npm run dev
```

### Production Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed production deployment instructions, including cPanel deployment.

### Environment Variables

Production requires these environment variables:

```env
NODE_ENV=production
DB_HOST=your-production-host
DB_NAME=your-production-db
DB_USER=your-production-user
DB_PASS=your-production-password
JWT_SECRET=your-production-jwt-secret-32-chars
SESSION_SECRET=your-production-session-secret-32-chars
```

## 🔧 Configuration

### Environment-Specific Configuration

The application supports multiple environments:

- **development**: Local development with verbose logging
- **test**: Testing environment with isolated database
- **staging**: Pre-production testing environment
- **production**: Production environment with optimized settings

### Database Configuration

Database settings are configured per environment in `src/config/environments/`.

### Security Configuration

Security settings include:

- JWT secret and expiration
- Session configuration
- Rate limiting settings
- CORS origins
- File upload restrictions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use ESLint for code linting
- Use Prettier for code formatting
- Follow the existing code style
- Write tests for new features
- Update documentation

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [troubleshooting guide](./docs/TROUBLESHOOTING.md)
2. Search existing [GitHub issues](../../issues)
3. Create a new issue with detailed information
4. Contact the development team

## 📚 Additional Documentation

- [Database Schema](./docs/DATABASE_SCHEMA.md)
- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Security Guide](./docs/SECURITY.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

---

**Built with ❤️ by the Ulasis Development Team**