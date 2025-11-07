# Ulasis Customer Intelligence Dashboard - Enterprise Enhancement PRD

## Intro Project Analysis and Context

### Existing Project Overview

#### Analysis Source
IDE-based fresh analysis of complete Ulasis Customer Intelligence Dashboard codebase

#### Current Project State
The Ulasis Customer Intelligence Dashboard is a sophisticated customer feedback and survey management system with a complete React/TypeScript frontend but no backend implementation. The system is designed as a SaaS platform for UKM (Indonesian Small/Medium Businesses) to collect, analyze, and act on customer feedback through QR-code-enabled surveys with bubble-based improvement analytics.

**Key Features Implemented:**
- Customer feedback collection via QR codes and public forms (anonymous)
- Survey/questionnaire builder with user-defined categories
- Bubble-based analytics for service/product improvement areas
- Review management system with manual comment processing
- QR code generation and management with user-defined location tags
- Measurable data analytics (no AI/ML processing)
- Multi-tier subscription management (Free/Starter/Business)
- Responsive dark/light theme UI
- Comprehensive mock data system

### Available Documentation Analysis

#### Available Documentation
✅ **Tech Stack Documentation** - Complete package.json and dependencies  
✅ **Source Tree/Architecture** - Well-organized component structure  
✅ **Type Definitions** - Comprehensive TypeScript type system  
✅ **API Documentation** - Detailed backend requirements specification  
✅ **UI Component Documentation** - Complete React component library  
❌ **Coding Standards** - Not explicitly documented  
❌ **Testing Documentation** - No test infrastructure present  
❌ **Deployment Documentation** - No deployment guides present  

**Using existing project analysis from comprehensive codebase review.**

### Enhancement Scope Definition

#### Enhancement Type
✅ **New Feature Addition** - Complete backend implementation  
✅ **Integration with New Systems** - MySQL database, cPanel deployment  
✅ **Performance/Scalability Improvements** - Production optimization  
✅ **Technology Stack Upgrade** - From mock to production stack  

#### Enhancement Description
Transform the existing frontend prototype into a production-ready, enterprise-grade full-stack SaaS application by implementing the complete Node.js 18 backend with MySQL database, enabling real deployment on cPanel hosting environments while preserving the existing UI/UX design and component structure. Focus on measurable data analytics with bubble-based improvement indicators for UKM business owners, anonymous response collection, and DANA payment foundation.

#### Impact Assessment
✅ **Major Impact** (architectural changes required) - Complete backend implementation, database integration, authentication system, API development, and production deployment configuration.

### Goals and Background Context

#### Goals
- Deploy a fully functional production SaaS application within 60 days
- Implement complete backend API as specified in backend_requirements.txt
- Enable real-time data persistence with MySQL database (unlimited retention)
- Achieve enterprise-grade security and performance standards
- Maintain existing UI/UX design with minimal changes
- Enable cPanel hosting deployment for easy market access
- Establish scalable architecture for multi-tenant SaaS operations
- Implement bubble-based analytics for UKM business improvement insights
- Create anonymous response system with QR code accessibility
- Build DANA payment foundation (structure only, manual control)

#### Background Context
The Ulasis Customer Intelligence Dashboard was built entirely by AI as a sophisticated prototype demonstrating customer feedback management capabilities for UKM businesses. While the frontend is complete and production-ready, it operates entirely on mock data, limiting its commercial viability. The business requirement is to transform this prototype into a marketable enterprise SaaS product focused on measurable insights and bubble-based improvement indicators, deployable on standard cPanel hosting environments, enabling immediate revenue generation through subscription tiers (Free/Starter/Business plans) with DANA payment foundation.

### Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|---------|
| Initial PRD Creation | 2025-10-26 | 1.0 | Enterprise enhancement specification | Product Manager |

## Requirements

### Functional

**FR1:** The system shall implement a complete Node.js 18 backend API as specified in `backend_requirements.txt` with all endpoints for authentication, questionnaires, QR codes, responses, analytics, and subscription management.

**FR2:** The system shall integrate with a MySQL database implementing the complete data model including users, questionnaires, questions, qr_codes, responses, answers, and reviews tables as specified in the backend requirements.

**FR3:** The system shall implement JWT-based authentication with secure password hashing, email verification, and session management for user registration, login, and protected routes.

**FR4:** The system shall provide real-time data persistence replacing all mock data operations, ensuring data survives page refreshes and server restarts with unlimited data retention for all subscription plans.

**FR5:** The system shall implement file upload capabilities for QR code logos with secure storage and CDN integration (Business plan only).

**FR6:** The system shall implement user-defined category system with bubble-based analytics for service and product improvement areas, using only measurable data (ratings, response counts, response rates).

**FR7:** The system shall provide anonymous response collection system allowing anyone to scan QR codes and submit feedback without login restrictions.

**FR8:** The system shall implement subscription management with clear plan limitations enforcement (Free: 1 questionnaire/50 responses, Starter: 5 questionnaires/500 responses, Business: unlimited).

**FR9:** The system shall provide time-period comparison analytics (week-over-week, custom date ranges) for tracking improvement trends.

**FR10:** The system shall implement DANA payment foundation with database structure and UI components, but manual subscription control (no automated payment processing).

**FR11:** The system shall provide email notification system for verification, password reset, and subscription alerts using SMTP integration.

**FR12:** The system shall implement data export functionality (CSV/Excel) for reports and analytics with proper filtering and formatting (Starter and Business plans).

### Non Functional

**NFR1:** The system shall maintain existing UI/UX design with less than 5% visual changes, ensuring component compatibility and user experience continuity.

**NFR2:** The system shall achieve sub-2 second page load times and handle 100+ concurrent users with proper database indexing and query optimization.

**NFR3:** The system shall implement enterprise-grade security including HTTPS enforcement, SQL injection prevention, XSS protection, and CSRF protection.

**NFR4:** The system shall achieve 99.5% uptime with proper error handling, logging, and monitoring capabilities.

**NFR5:** The system shall be deployable on standard cPanel hosting environments with shared hosting constraints and resource limitations.

**NFR6:** The system shall implement proper data backup and recovery procedures with automated daily backups and point-in-time restoration capabilities.

**NFR7:** The system shall comply with GDPR and data protection regulations including data deletion, export, and consent management.

**NFR8:** The system shall implement comprehensive API rate limiting and DDoS protection to ensure service availability.

**NFR9:** The system shall provide bubble-based visualization that clearly indicates improvement areas using color coding (red: urgent, yellow: monitor, green: good performance).

**NFR10:** The system shall ensure anonymous response collection works seamlessly without requiring user authentication or login.

**NFR11:** The system shall enforce subscription limitations in real-time with clear upgrade prompts when limits are reached.

### Compatibility Requirements

**CR1:** The backend API shall maintain 100% compatibility with existing frontend component interfaces and data structures defined in `types.ts`.

**CR2:** The database schema shall support all existing frontend data models and relationships without requiring frontend type modifications.

**CR3:** The UI/UX shall maintain complete consistency with existing design system, color schemes, and component behaviors.

**CR4:** The integration approach shall preserve all existing component communication patterns and state management approaches.

## User Interface Enhancement Goals

### Integration with Existing UI

The enhancement shall integrate seamlessly with the existing React component architecture, maintaining all current UI patterns, design tokens, and interaction behaviors. The backend implementation shall be completely transparent to frontend components, preserving the existing props interfaces and event handling patterns.

### Modified/New Screens and Views

- **Authentication Screens**: Enhanced login/register with real validation and error handling
- **Settings Pages**: Functional billing and subscription management
- **Admin Dashboard**: New admin interface for user and system management
- **Public Forms**: Enhanced public questionnaire views with real submission

### UI Consistency Requirements

- Maintain existing Tailwind CSS class structure and design system
- Preserve all existing component animations and transitions
- Keep current color scheme and branding elements
- Ensure responsive design consistency across all devices
- Maintain existing dark/light theme functionality

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages**: TypeScript (Frontend), JavaScript (Backend)  
**Frameworks**: React 19.2.0, Node.js 18+  
**Database**: MySQL 8.0+  
**Build Tools**: Vite 6.2.0  
**UI Library**: Tailwind CSS (via CDN)  
**Charts**: Recharts 3.2.1  
**AI Integration**: @google/genai 1.24.0  

### Integration Approach

**Database Integration Strategy**: Implement MySQL with proper connection pooling, transaction management, and migration scripts using Sequelize ORM for compatibility with existing TypeScript interfaces. Ensure unlimited data retention for all subscription plans.

**API Integration Strategy**: RESTful API implementation matching exactly the endpoint specifications in `backend_requirements.txt` with proper error handling, validation, and response formatting. Include subscription limitation enforcement.

**Frontend Integration Strategy**: Replace mock data calls with real API calls while maintaining existing component interfaces, implementing proper loading states and error handling. Preserve bubble-based visualization approach.

**Testing Integration Strategy**: Implement comprehensive testing suite with Jest for unit tests, Supertest for API tests, and Cypress for E2E tests.

**Payment Integration Strategy**: Implement DANA payment foundation with complete database structure and UI components, but manual subscription control through database access (no automated payment processing).

### Code Organization and Standards

**File Structure Approach**: 
```
Ulasis/
├── Frontend/ (existing - minimal changes)
├── Backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── utils/
│   │   └── config/
│   ├── tests/
│   ├── migrations/
│   └── package.json
└── shared/
    └── types/ (shared TypeScript definitions)
```

**Naming Conventions**: Continue existing camelCase for JavaScript/TypeScript, snake_case for database fields, kebab-case for API routes.

**Coding Standards**: ESLint + Prettier configuration matching existing frontend standards, TypeScript strict mode, comprehensive JSDoc documentation.

**Documentation Standards**: OpenAPI/Swagger documentation for all APIs, comprehensive README for deployment, inline code documentation for complex logic.

### Deployment and Operations

**Build Process Integration**: Separate build processes for frontend (Vite) and backend (Node.js), with automated asset optimization and CDN integration.

**Deployment Strategy**: cPanel-compatible deployment with proper .htaccess configuration, environment variable management, and automated deployment scripts.

**Monitoring and Logging**: Winston for application logging, Morgan for HTTP request logging, error tracking with Sentry integration, performance monitoring with custom metrics.

**Configuration Management**: Environment-based configuration with .env files, secure credential management, database connection pooling, and caching strategies.

### Risk Assessment and Mitigation

**Technical Risks**: 
- Database performance under load → Implement proper indexing, query optimization, connection pooling
- API security vulnerabilities → Comprehensive security testing, input validation, rate limiting
- cPanel deployment constraints → Thorough testing on target environment, resource optimization
- Bubble visualization complexity → Simple, transparent calculations without AI/ML processing

**Integration Risks**: 
- Frontend-backend data mismatch → Strict TypeScript interfaces, comprehensive integration testing
- Anonymous response system abuse → Implement rate limiting, spam protection, device tracking
- Subscription enforcement complexity → Clear limitation logic with real-time validation
- DANA payment foundation scope → Keep structure simple, manual control only

**Deployment Risks**: 
- Environment configuration issues → Detailed deployment documentation, environment validation scripts
- Database migration failures → Comprehensive migration testing, rollback procedures
- Performance degradation in production → Load testing, performance monitoring, optimization procedures
- Subscription limit enforcement bugs → Extensive testing of plan boundaries and upgrade triggers

**Mitigation Strategies**: 
- Implement comprehensive testing suite with >90% code coverage
- Use proven, well-maintained libraries and frameworks
- Implement gradual rollout with feature flags
- Establish monitoring and alerting systems
- Create detailed rollback procedures for all deployments
- Focus on measurable data only (no AI/ML complexity)

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: Single comprehensive epic for complete backend implementation with sequential stories to minimize risk and ensure system integrity throughout development.

**Rationale**: This enhancement requires a complete backend implementation where all components are interdependent. A single epic approach ensures proper sequencing, maintains system integrity, and allows for incremental testing and validation.

## Epic 1: Enterprise Backend Implementation

**Epic Goal**: Transform the Ulasis frontend prototype into a production-ready enterprise SaaS application with complete Node.js backend, MySQL database, and cPanel deployment capability. Focus on bubble-based analytics for UKM improvement insights, anonymous response collection, and subscription-based limitations.

**Integration Requirements**: Maintain 100% compatibility with existing frontend components while implementing all backend functionality as specified in requirements documentation. Ensure measurable data analytics only, no AI/ML processing, and DANA payment foundation with manual control.

### Story 1.1: Foundation and Database Setup

As a developer,
I want to establish the backend foundation with database setup and basic project structure,
so that I have a solid base for implementing all backend functionality with unlimited data retention.

**Acceptance Criteria:**
1. Node.js 18+ backend project structure created with proper folder organization
2. MySQL database connection established with Sequelize ORM configuration
3. Database migration system implemented with all tables from backend_requirements.txt
4. Basic Express.js server setup with middleware configuration
5. Environment configuration system implemented with .env support
6. Basic health check endpoint implemented and tested
7. Project documentation updated with setup and deployment instructions
8. Database schema designed for unlimited data retention across all subscription plans

**Integration Verification:**
IV1: Verify database connection and table creation match existing frontend data models
IV2: Confirm Express server can serve static frontend files in development
IV3: Test environment configuration loads properly across development/staging/production
IV4: Validate unlimited data retention capability in database design

### Story 1.2: Authentication System Implementation

As a user,
I want to register, login, and manage my account with secure authentication,
so that I can access the platform's features securely and manage my subscription.

**Acceptance Criteria:**
1. User registration endpoint with email validation and password hashing
2. User login endpoint with JWT token generation and secure session management
3. Email verification system with SMTP integration
4. Password reset functionality with secure token-based reset process
5. Authentication middleware for protecting API routes
6. User profile management endpoints
7. Session management with proper token refresh and logout functionality

**Integration Verification:**
IV1: Verify authentication tokens work with existing frontend authentication flow
IV2: Confirm user data structure matches frontend User interface in types.ts
IV3: Test protected routes properly reject unauthorized requests

### Story 1.3: Core Data Management APIs

As a user,
I want to create, read, update, and delete questionnaires and QR codes through APIs,
so that I can manage my feedback collection system programmatically.

**Acceptance Criteria:**
1. Complete CRUD API endpoints for questionnaires matching backend_requirements.txt
2. Complete CRUD API endpoints for QR codes with questionnaire linking
3. Question management APIs for creating and updating questionnaire questions
4. File upload system for QR code logos with secure storage
5. Data validation and sanitization for all input endpoints
6. Proper error handling and response formatting for all APIs
7. API documentation generated with OpenAPI/Swagger

**Integration Verification:**
IV1: Verify all API responses match expected frontend component data structures
IV2: Confirm file upload integrates properly with existing QR code components
IV3: Test CRUD operations maintain data consistency and relationships

### Story 1.4: Anonymous Feedback Collection and Processing

As a customer,
I want to submit feedback through public forms and QR codes without login,
so that businesses can collect valuable customer insights and reviews.

**Acceptance Criteria:**
1. Anonymous public form submission API for questionnaire responses
2. Response processing system that creates measurable data from form submissions
3. User-defined category system with question-to-category mapping
4. QR code scan tracking with user-defined location tags
5. Response rate calculation and KPI updates based on measurable data only
6. Batch processing for handling high-volume submissions
7. Spam protection and rate limiting for anonymous submissions

**Integration Verification:**
IV1: Verify anonymous form submissions integrate with existing PublicQuestionnaireView component
IV2: Confirm user-defined category system produces measurable analytics data
IV3: Test QR code tracking maintains data integrity without GPS/location services
IV4: Validate anonymous response system works without authentication requirements

### Story 1.5: Bubble-Based Analytics and Reporting System

As a UKM business owner,
I want to view bubble-based analytics for improvement areas,
so that I can make practical decisions based on measurable customer feedback.

**Acceptance Criteria:**
1. Bubble visualization APIs with color-coded improvement indicators (red/yellow/green)
2. Time-period comparison endpoints (week-over-week, custom date ranges)
3. Category-based analytics using user-defined improvement areas
4. Measurable data processing (ratings, response counts, response rates only)
5. Report generation system with CSV/Excel export functionality (Starter/Business plans)
6. Performance optimization for analytics queries with unlimited data retention
7. Caching system for frequently accessed analytics data

**Integration Verification:**
IV1: Verify bubble analytics data formats match existing Dashboard component expectations
IV2: Confirm time-period comparison produces clear improvement/decline indicators
IV3: Test category-based analytics provides actionable insights for UKM businesses
IV4: Validate export functionality produces properly formatted files for paid plans

### Story 1.6: Subscription Management and DANA Payment Foundation

As a business owner,
I want to manage subscriptions with clear limitations,
so that I can access appropriate features and the platform can enforce plan boundaries.

**Acceptance Criteria:**
1. Subscription plan management with clear tier limitations (Free: 1Q/50R, Starter: 5Q/500R, Business: unlimited)
2. DANA payment foundation with complete database structure and UI components
3. Manual subscription control through database access (no automated processing)
4. Plan limitation enforcement with real-time validation and upgrade prompts
5. Usage tracking for questionnaires, responses, and other plan-specific features
6. Email-based user model (1 email = 1 user account)
7. Unlimited data retention for all subscription plans

**Integration Verification:**
IV1: Verify subscription limits integrate with existing frontend plan restrictions
IV2: Confirm DANA payment UI components are present but non-functional
IV3: Test manual subscription changes through database properly update user permissions
IV4: Validate real-time limitation enforcement prevents overages

### Story 1.7: Email and Notification System

As a user,
I want to receive email notifications for important events,
so that I stay informed about account activity and customer feedback.

**Acceptance Criteria:**
1. SMTP email service integration with proper configuration
2. Email template system for transactional emails
3. Notification preferences management for users
4. Automated email triggers for key events (new reviews, subscription changes)
5. Email queue system for reliable delivery
6. Email delivery tracking and bounce handling
7. Notification history and management interface

**Integration Verification:**
IV1: Verify email templates match existing branding and design
IV2: Confirm notification preferences integrate with settings components
IV3: Test email delivery reliability and spam compliance

### Story 1.8: Admin and System Management

As a system administrator,
I want to manage users and monitor system performance,
so that I can ensure smooth operation and security of the platform.

**Acceptance Criteria:**
1. Admin dashboard for user management and system monitoring
2. User activity logging and audit trail system
3. System health monitoring and alerting
4. Backup and restore functionality for data protection
5. Security monitoring and intrusion detection
6. Performance metrics collection and reporting
7. Administrative tools for content moderation and support

**Integration Verification:**
IV1: Verify admin interface maintains existing UI design patterns
IV2: Confirm monitoring data integrates with existing analytics components
IV3: Test administrative actions maintain data integrity and security

### Story 1.9: Frontend Integration and Bubble Analytics Testing

As a developer,
I want to integrate the frontend with the new backend APIs,
so that the application works end-to-end with real measurable data and bubble visualizations.

**Acceptance Criteria:**
1. Replace all mock data calls with real API integration
2. Implement proper loading states and error handling in all components
3. Add comprehensive error boundaries and user feedback systems
4. Integrate bubble-based analytics with existing Dashboard components
5. Implement anonymous response system with existing PublicQuestionnaireView
6. Add subscription limitation UI with upgrade prompts
7. Add comprehensive integration tests for all user flows
8. Ensure responsive design and accessibility standards are maintained

**Integration Verification:**
IV1: Verify all existing components work with real backend data
IV2: Confirm bubble analytics display correctly with color-coded indicators
IV3: Test anonymous response system works without authentication
IV4: Validate subscription limitations trigger appropriate UI responses
IV5: Test application performance meets NFR requirements

### Story 1.10: Production Deployment and Optimization

As a DevOps engineer,
I want to deploy the application to cPanel with production optimization,
so that the application is secure, performant, and ready for market launch.

**Acceptance Criteria:**
1. cPanel deployment configuration with proper .htaccess setup
2. Production build optimization for frontend assets and backend code
3. SSL certificate configuration and HTTPS enforcement
4. Database optimization with proper indexing and query tuning
5. Security hardening including firewall rules and access controls
6. Monitoring and logging setup for production environment
7. Backup and disaster recovery procedures implementation

**Integration Verification:**
IV1: Verify deployment process maintains application functionality
IV2: Confirm security measures protect against common vulnerabilities
IV3: Test performance meets production requirements under load