# Coding Standards

## Existing Standards Compliance

**Code Style:** ESLint + Prettier configuration inferred from existing frontend code, consistent formatting, proper indentation and spacing.

**Linting Rules:** TypeScript strict mode, no unused variables, proper type annotations, consistent naming conventions.

**Testing Patterns:** No existing test infrastructure - implementing comprehensive testing suite with Jest for backend, Cypress for E2E.

**Documentation Style:** JSDoc comments for complex functions, inline comments for business logic, comprehensive README files.

## Enhancement-Specific Standards

- **API Documentation:** OpenAPI/Swagger documentation for all endpoints
- **Database Documentation:** Entity-relationship diagrams, migration documentation
- **Security Standards:** Input validation, SQL injection prevention, XSS protection
- **Performance Standards:** Query optimization, caching strategies, response time limits

## Critical Integration Rules

- **Existing API Compatibility:** Maintain 100% compatibility with existing frontend component interfaces
- **Database Integration:** Use Sequelize ORM with proper transaction management and connection pooling
- **Error Handling:** Consistent error response format across all API endpoints
- **Logging Consistency:** Structured logging with Winston, proper log levels and correlation IDs
