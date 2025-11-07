'use strict';

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const logger = require('../utils/logger');

/**
 * Swagger/OpenAPI configuration
 */

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ulasis Backend API',
      version: '1.0.0',
      description: `## Ulasis Questionnaire & Analytics Platform API

This API provides comprehensive functionality for managing questionnaires, QR codes, questions, and user responses.

### Features
- **Questionnaire Management**: Create, read, update, and delete questionnaires
- **QR Code Generation**: Generate QR codes with custom styling and logos
- **Question Management**: Manage questions within questionnaires
- **File Upload**: Secure file upload for QR code logos
- **User Authentication**: JWT-based authentication system
- **Subscription Management**: Enforce subscription-based limits
- **Analytics**: Track QR code scans and questionnaire responses

### Authentication
Most endpoints require authentication using a JWT token. Include the token in the Authorization header:

\`\`\`http
Authorization: Bearer <your-jwt-token>
\`\`\`

### Rate Limiting
API endpoints are rate-limited to prevent abuse:
- General endpoints: 100 requests/minute
- QR code endpoints: 50 requests/minute  
- File upload endpoints: 10 uploads/minute
- Question management: 200 requests/minute

### Error Handling
All errors follow a consistent format:

\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "status": 400,
    "details": [...]
  },
  "timestamp": "2025-10-27T10:00:00Z"
}
\`\`\`

### Subscription Plans
API usage is limited based on user subscription:
- **Free**: 1 questionnaire
- **Starter**: 5 questionnaires  
- **Business**: Unlimited questionnaires + CDN support

### File Upload
QR code logos can be uploaded with the following constraints:
- **File types**: PNG, JPG, JPEG, GIF, WebP
- **Max size**: 5MB
- **Security**: Magic number validation, content scanning
- **Storage**: User-isolated directories with secure filenames`,
      contact: {
        name: 'Ulasis Development Team',
        email: 'support@ulasis.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.ulasis.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Machine-readable error code',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  description: 'Human-readable error message',
                  example: 'Request validation failed',
                },
                status: {
                  type: 'integer',
                  description: 'HTTP status code',
                  example: 400,
                },
                details: {
                  type: 'array',
                  description: 'Additional error details',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string',
                        description: 'Field name',
                      },
                      message: {
                        type: 'string',
                        description: 'Error message for the field',
                      },
                    },
                  },
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp',
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number',
              example: 1,
            },
            limit: {
              type: 'integer',
              description: 'Items per page',
              example: 10,
            },
            total: {
              type: 'integer',
              description: 'Total number of items',
              example: 25,
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages',
              example: 3,
            },
          },
        },
        Usage: {
          type: 'object',
          properties: {
            used: {
              type: 'integer',
              description: 'Number of items used',
              example: 3,
            },
            limit: {
              type: 'integer',
              description: 'Maximum allowed items',
              example: 5,
            },
            plan: {
              type: 'string',
              description: 'Subscription plan name',
              example: 'starter',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and token management',
      },
      {
        name: 'Questionnaires',
        description: 'Questionnaire CRUD operations and management',
      },
      {
        name: 'Questions',
        description: 'Question management within questionnaires',
      },
      {
        name: 'QR Codes',
        description: 'QR code generation and management',
      },
      {
        name: 'Health',
        description: 'System health and monitoring endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/models/*.js'],
};

const specs = swaggerJsdoc(options);

const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    customSiteTitle: 'Ulasis API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .scheme-container { margin: 20px 0 }
      .swagger-ui .opblock.opblock-post { border-color: #49cc90 }
      .swagger-ui .opblock.opblock-get { border-color: #61affe }
      .swagger-ui .opblock.opblock-put { border-color: #fca130 }
      .swagger-ui .opblock.opblock-delete { border-color: #f93e3e }
    `,
    customfavIcon: '/favicon.ico',
  },
};

/**
 * Setup Swagger documentation middleware
 * @param {Object} app - Express app instance
 */
const setupSwagger = (app) => {
  // Swagger UI endpoint
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(specs, swaggerUiOptions));

  // JSON specification endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  // Redirect root API docs to Swagger UI
  app.get('/docs', (req, res) => {
    res.redirect('/api-docs');
  });

  logger.info('📚 Swagger documentation available at: /api-docs');
  logger.info('📄 JSON specification available at: /api-docs.json');
};

module.exports = {
  specs,
  setupSwagger,
  swaggerUiOptions,
};
