# Source Tree

## Existing Project Structure

```
Ulasis/
├── public/                     # Static assets
├── src/
│   ├── components/            # React components
│   │   ├── common/           # Reusable components
│   │   ├── auth/             # Authentication components
│   │   ├── dashboard/        # Dashboard and analytics
│   │   ├── questionnaires/   # Survey management
│   │   └── qr-codes/         # QR code generation
│   ├── hooks/                # Custom React hooks
│   ├── services/             # API service functions
│   ├── types/                # TypeScript definitions
│   ├── utils/                # Utility functions
│   └── App.tsx              # Main application component
├── package.json              # Frontend dependencies
└── vite.config.js           # Build configuration
```

## New File Organization

```
Ulasis/
├── Frontend/                 # Existing frontend (minimal changes)
│   ├── public/              # Static assets
│   ├── src/                 # React application
│   │   ├── components/      # Existing components
│   │   ├── services/        # Updated API integration
│   │   └── types/          # Existing TypeScript definitions
│   └── package.json         # Frontend dependencies
├── Backend/                  # New backend implementation
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   │   ├── authController.js
│   │   │   ├── questionnaireController.js
│   │   │   ├── analyticsController.js
│   │   │   └── responseController.js
│   │   ├── models/          # Database models
│   │   │   ├── User.js
│   │   │   ├── Questionnaire.js
│   │   │   ├── Question.js
│   │   │   ├── QRCode.js
│   │   │   ├── Response.js
│   │   │   ├── Answer.js
│   │   │   └── Review.js
│   │   ├── routes/          # API route definitions
│   │   │   ├── auth.js
│   │   │   ├── questionnaires.js
│   │   │   ├── analytics.js
│   │   │   └── responses.js
│   │   ├── middleware/      # Express middleware
│   │   │   ├── auth.js
│   │   │   ├── validation.js
│   │   │   ├── subscription.js
│   │   │   └── errorHandler.js
│   │   ├── services/        # Business logic services
│   │   │   ├── authService.js
│   │   │   ├── analyticsService.js
│   │   │   ├── emailService.js
│   │   │   └── subscriptionService.js
│   │   ├── utils/           # Utility functions
│   │   │   ├── database.js
│   │   │   ├── logger.js
│   │   │   └── helpers.js
│   │   ├── config/          # Configuration files
│   │   │   ├── database.js
│   │   │   ├── email.js
│   │   │   └── app.js
│   │   └── app.js           # Express application
│   ├── tests/               # Backend tests
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   ├── migrations/          # Database migrations
│   │   ├── 001-create-users.js
│   │   ├── 002-create-questionnaires.js
│   │   └── ...
│   ├── uploads/             # File upload storage
│   └── package.json         # Backend dependencies
├── shared/                  # Shared resources
│   └── types/              # Shared TypeScript definitions
└── docs/                   # Project documentation
    ├── prd.md
    ├── architecture.md
    └── deployment.md
```

## Integration Guidelines

- **File Naming:** Continue existing camelCase for JavaScript/TypeScript files, kebab-case for API routes
- **Folder Organization:** Maintain existing frontend structure, follow Node.js conventions for backend
- **Import/Export Patterns:** Use ES6 modules throughout, maintain existing import patterns in frontend
