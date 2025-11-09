# ULASIS - Complete Questionnaire Management System

A comprehensive full-stack application for creating, managing, and analyzing questionnaire responses with advanced analytics and subscription management.

## 📁 Project Structure

This repository is organized to show only the essential directories:

- **`Frontend/`** - React.js frontend application with TypeScript
- **`Backend/`** - Node.js backend API with Express and SQLite
- **`.github/`** - GitHub Actions CI/CD workflows

## 🚀 Quick Start

### Frontend
```bash
cd Frontend
npm install
npm run dev
```

### Backend
```bash
cd Backend
npm install
npm start
```

## 🧪 Testing

The project includes comprehensive E2E testing with Playwright:

```bash
# Frontend tests
cd Frontend
npm run test:e2e

# Backend tests
cd Backend
npm test
```

## 📋 Features

- **User Management**: Registration, authentication, and role-based access
- **Questionnaire Creation**: Dynamic form builder with multiple question types
- **Analytics Dashboard**: Comprehensive response analysis with Bubble.io integration
- **Subscription System**: DANA payment integration for premium features
- **Admin Panel**: Enterprise admin dashboard for system management
- **Demo Mode**: Instant access for demonstration purposes

## 🔧 Technology Stack

### Frontend
- React.js with TypeScript
- Tailwind CSS for styling
- Playwright for E2E testing
- Vite for development

### Backend
- Node.js with Express
- SQLite database with Sequelize ORM
- JWT authentication
- DANA payment integration

## 📖 Documentation

For detailed documentation, please refer to the individual README files in the `Frontend/` and `Backend/` directories.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.