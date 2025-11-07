# Tech Stack

## Existing Technology Stack

| Category | Current Technology | Version | Usage in Enhancement | Notes |
|----------|-------------------|---------|---------------------|-------|
| Frontend Framework | React | 19.2.0 | Maintained unchanged | Production-ready, no changes needed |
| Language | TypeScript | 5.0+ | Maintained for frontend | Strict mode for type safety |
| Build Tool | Vite | 6.2.0 | Maintained for frontend builds | Fast development and production builds |
| UI Framework | Tailwind CSS | 3.x | Maintained unchanged | Via CDN, existing design system |
| Charts | Recharts | 3.2.1 | Maintained for analytics | Bubble visualization components |
| Backend Runtime | Node.js | 18+ | New implementation | LTS version for stability |
| Database | MySQL | 8.0+ | New implementation | Production-ready with unlimited retention |
| ORM | Sequelize | 6.x | New implementation | TypeScript support, MySQL compatibility |

## New Technology Additions

| Technology | Version | Purpose | Rationale | Integration Method |
|------------|---------|---------|-----------|-------------------|
| Express.js | 4.x | Backend API framework | Proven, lightweight, TypeScript support | RESTful API server |
| JWT | jsonwebtoken | Authentication | Secure token-based auth | Middleware integration |
| bcrypt | 5.x | Password hashing | Security best practice | User authentication |
| nodemailer | 6.x | Email notifications | SMTP integration | Transactional emails |
| multer | 1.x | File uploads | QR code logo storage | Middleware for file handling |
| cors | 2.x | CORS handling | API security | Express middleware |
| helmet | 7.x | Security headers | Web security | Express middleware |
| winston | 3.x | Logging | Application logging | Structured logging |
| jest | 29.x | Testing | Unit and integration tests | Backend testing framework |
