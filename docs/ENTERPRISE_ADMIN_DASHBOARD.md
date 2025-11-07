# Enterprise Admin Dashboard Documentation

## Overview

The Enterprise Admin Dashboard provides a comprehensive administrative interface for managing the Ulasis platform. This dashboard offers role-based access control, real-time analytics, user management, and security monitoring capabilities.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation & Setup](#installation--setup)
3. [Authentication & Access](#authentication--access)
4. [Dashboard Features](#dashboard-features)
5. [User Guide](#user-guide)
6. [Security Features](#security-features)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

## System Requirements

### Backend Requirements

- **Node.js**: 18.x or higher
- **Database**: PostgreSQL 12+ or MySQL 8.0+
- **Redis**: 6.0+ (for session management and caching)
- **Memory**: Minimum 4GB RAM
- **Storage**: Minimum 20GB available space

### Frontend Requirements

- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **JavaScript**: Enabled
- **Screen Resolution**: Minimum 1280x720 (recommended 1920x1080)
- **Network**: Stable internet connection

### Optional Requirements

- **SSL Certificate**: Required for production environments
- **Load Balancer**: Recommended for high-availability deployments
- **Monitoring**: Application performance monitoring tools

## Installation & Setup

### 1. Backend Setup

#### Environment Configuration

Create and configure environment variables:

```bash
# Copy example environment file
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**

```env
# Application
NODE_ENV=production
APP_NAME=Ulasis Enterprise
PORT=3001
APP_URL=https://admin.yourdomain.com

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ulasis_enterprise
DB_USER=ulasis_admin
DB_PASSWORD=your_secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
JWT_EXPIRES_IN=8h

# Email
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_email@yourdomain.com
SMTP_PASSWORD=your_email_password

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 2FA
TWO_FACTOR_ISSUER=Ulasis Enterprise
```

#### Database Setup

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Seed initial data (admin roles, permissions)
npm run seed

# Create database backup
npm run backup:create
```

#### Install Enterprise Admin Dependencies

```bash
# Install additional enterprise admin packages
npm install express-rate-limit helmet cors bcryptjs jsonwebtoken
npm install speakeasy qrcode nodemailer winston express-validator
npm install @sentry/node @sentry/tracing compression morgan
```

### 2. Frontend Setup

#### Build Frontend Assets

```bash
cd Frontend

# Install dependencies
npm install

# Build for production
npm run build

# Run tests
npm test
```

#### Configure Frontend

Create `Frontend/.env.production`:

```env
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
VITE_APP_NAME=Ulasis Enterprise Admin
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=your_sentry_dsn
```

### 3. Web Server Configuration

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/ulasis-admin
server {
    listen 80;
    server_name admin.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Frontend Assets
    location / {
        root /var/www/ulasis/Frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=admin burst=20 nodelay;
    }

    # Health Check
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}

# Rate Limiting
http {
    limit_req_zone $binary_remote_addr zone=admin:10m rate=10r/s;
}
```

#### Systemd Service

Create `/etc/systemd/system/ulasis-admin.service`:

```ini
[Unit]
Description=Ulasis Enterprise Admin Backend
After=network.target

[Service]
Type=simple
User=ulasis
WorkingDirectory=/var/www/ulasis/Backend
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

# Logging
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=ulasis-admin

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/ulasis/Backend/logs

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable ulasis-admin
sudo systemctl start ulasis-admin
sudo systemctl status ulasis-admin
```

### 4. SSL Certificate Setup

#### Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d admin.yourdomain.com

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Authentication & Access

### Initial Admin Setup

1. **Create First Admin User**

```bash
# Run admin setup script
node scripts/createFirstAdmin.js

# Or manually create via database
INSERT INTO users (email, first_name, last_name, password_hash, is_active, created_at, updated_at)
VALUES ('admin@yourdomain.com', 'Super', 'Admin', '$2b$12$hashedpassword', true, NOW(), NOW());

INSERT INTO admin_users (user_id, role_id, is_active, two_factor_enabled, created_at, updated_at)
VALUES (1, 1, true, false, NOW(), NOW());
```

2. **Configure Admin Roles**

Default roles created during seeding:

- **Super Admin**: Full system access
- **Admin**: User and content management
- **Analyst**: Read-only analytics access
- **Support**: Limited user support access

### Login Process

1. **Access Dashboard**
   - Navigate to `https://admin.yourdomain.com`
   - Enter admin credentials
   - Complete 2FA if enabled

2. **Two-Factor Authentication Setup**
   - Go to Settings → Security
   - Click "Enable Two-Factor Authentication"
   - Scan QR code with authenticator app
   - Enter verification code
   - Save backup codes securely

### Session Management

- **Session Duration**: 8 hours (configurable)
- **Concurrent Sessions**: Maximum 3 per admin
- **Automatic Logout**: After inactivity timeout
- **Remember Me**: 7 days (secure cookie)

## Dashboard Features

### 1. Overview Dashboard

**Key Metrics Display:**
- Total registered users
- Active sessions
- System health status
- Recent activities
- Performance indicators

**Real-time Updates:**
- Live user count
- System resource usage
- Error rates
- Response times

### 2. User Management

**User Directory:**
- Search and filter users
- Bulk operations (export, deactivate)
- User status management
- Subscription management

**User Details:**
- Profile information
- Activity history
- Login statistics
- Subscription details

**Bulk Operations:**
- Export user data (CSV/Excel)
- Mass email campaigns
- Subscription changes
- Account status updates

### 3. Analytics Dashboard

**Traffic Analytics:**
- Page views and unique visitors
- User engagement metrics
- Device and browser statistics
- Geographic distribution

**Performance Analytics:**
- Response times
- Error rates
- Database performance
- API usage statistics

**Business Analytics:**
- Subscription metrics
- Revenue tracking
- User retention rates
- Conversion funnels

### 4. Security Monitoring

**Security Dashboard:**
- Failed login attempts
- Suspicious activities
- Security alerts
- Blocked IPs

**Audit Logs:**
- Admin activity tracking
- User action logs
- System events
- Data access logs

**Security Settings:**
- IP whitelist/blacklist
- Rate limiting configuration
- Security policies
- Alert notifications

### 5. System Administration

**System Health:**
- Service status monitoring
- Database connectivity
- Resource utilization
- Performance metrics

**Configuration Management:**
- Application settings
- Feature flags
- Email templates
- System notifications

**Backup Management:**
- Automated backups
- Manual backup creation
- Restore operations
- Backup scheduling

## User Guide

### Navigation

**Main Menu:**
- Dashboard: Overview and key metrics
- Users: User management interface
- Analytics: Data and reports
- Security: Security monitoring
- Settings: Configuration options
- Logs: System and audit logs

**Quick Actions:**
- Add new user
- Generate reports
- System backup
- Security scan

### Common Workflows

#### Adding a New User

1. Navigate to Users → Add User
2. Fill in user information:
   - Email address
   - First and last name
   - Initial password
   - Role assignment
3. Set subscription plan
4. Send welcome email
5. Review and confirm

#### Managing User Subscriptions

1. Search for user in Users directory
2. Click on user profile
3. Go to Subscription tab
4. Modify plan or status
5. Add notes if necessary
6. Save changes

#### Generating Reports

1. Navigate to Analytics → Reports
2. Select report type:
   - User activity
   - System performance
   - Financial summary
3. Set date range
4. Apply filters
5. Generate and download

#### Handling Security Incidents

1. Navigate to Security → Incidents
2. Review alert details
3. Investigate affected accounts
4. Take appropriate action:
   - Block suspicious IP
   - Reset user passwords
   - Enable additional monitoring
5. Document resolution

### Data Export

**Supported Formats:**
- CSV (Excel compatible)
- JSON (API integration)
- PDF (Reports)

**Export Options:**
- Date range selection
- Field customization
- Filter application
- Scheduled exports

## Security Features

### Authentication Security

**Password Requirements:**
- Minimum 12 characters
- Include uppercase, lowercase, numbers
- Special characters required
- Password history tracking

**Two-Factor Authentication:**
- TOTP (Time-based One-Time Password)
- Backup codes (10 codes)
- SMS verification (optional)
- Email verification (fallback)

**Session Security:**
- Secure HTTP-only cookies
- CSRF token validation
- Session fixation prevention
- Automatic timeout

### Access Control

**Role-Based Permissions:**
- Granular permission system
- Hierarchical role structure
- Custom role creation
- Permission inheritance

**IP Restrictions:**
- IP whitelist support
- Geographic restrictions
- VPN detection
- Anonymizer blocking

**Rate Limiting:**
- Request rate limits
- Progressive delays
- Account lockout
- IP-based throttling

### Data Protection

**Encryption:**
- Data at rest encryption
- Data in transit encryption
- Password hashing (bcrypt)
- Sensitive data masking

**Audit Trail:**
- Complete action logging
- User activity tracking
- Data access logging
- Change history

**Compliance:**
- GDPR compliance features
- Data retention policies
- Right to deletion
- Data export capabilities

## Troubleshooting

### Common Issues

#### Login Problems

**Issue:** Cannot login with valid credentials
```
Solution:
1. Check user account is active
2. Verify password is correct
3. Clear browser cache and cookies
4. Check if account is locked
5. Verify 2FA is working correctly
```

**Issue:** 2FA not working
```
Solution:
1. Check device time is synchronized
2. Verify authenticator app setup
3. Use backup codes if available
4. Contact super admin for reset
```

#### Performance Issues

**Issue:** Dashboard loading slowly
```
Solution:
1. Check internet connection
2. Clear browser cache
3. Disable browser extensions
4. Check server status
5. Review system resources
```

**Issue:** Data not updating
```
Solution:
1. Refresh browser page
2. Check WebSocket connection
3. Verify backend services
4. Review error logs
5. Check database connectivity
```

#### Security Issues

**Issue:** Account locked out
```
Solution:
1. Wait for lockout period (15 minutes)
2. Contact another admin
3. Use password reset if available
4. Check for suspicious activity
```

**Issue:** Security alerts triggered
```
Solution:
1. Review alert details
2. Verify legitimate activity
3. Update security settings
4. Document investigation
```

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| AUTH_001 | Invalid credentials | Check email/password |
| AUTH_002 | Account locked | Wait or contact admin |
| AUTH_003 | 2FA required | Complete 2FA verification |
| AUTH_004 | Session expired | Login again |
| PERM_001 | Insufficient permissions | Contact admin for access |
| SYS_001 | Database error | Check database status |
| SYS_002 | Service unavailable | Check system status |

### Log Locations

**Backend Logs:**
- Application logs: `Backend/logs/app.log`
- Error logs: `Backend/logs/error.log`
- Access logs: `Backend/logs/access.log`
- Security logs: `Backend/logs/security.log`

**Frontend Logs:**
- Browser console (F12)
- Network tab for API errors
- Application storage for local data

### Support Resources

**Documentation:**
- API Reference: `/docs/api`
- User Guide: `/docs/user-guide`
- Security Guide: `/docs/security`

**Contact Support:**
- Email: admin-support@yourdomain.com
- Slack: #ulasis-admin-support
- Emergency: +1-555-ADMIN-HELP

## API Reference

### Authentication Endpoints

#### POST /api/v1/enterprise-admin/login
Authenticate admin user.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "password123",
  "twoFactorToken": "123456",
  "rememberMe": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin login successful",
  "data": {
    "token": "jwt_token_here",
    "adminUser": {
      "id": 1,
      "user": {
        "email": "admin@example.com",
        "firstName": "Admin",
        "lastName": "User"
      },
      "role": {
        "name": "Super Admin",
        "permissions": ["*"]
      },
      "twoFactorEnabled": false
    },
    "session": {
      "sessionId": "session_id_here",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

#### POST /api/v1/enterprise-admin/logout
Logout admin user.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "message": "Admin logout successful"
}
```

### User Management Endpoints

#### GET /api/v1/enterprise-admin/users
Get paginated list of users.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search term
- `status`: Filter by status
- `role`: Filter by role

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "isActive": true,
        "subscription": {
          "plan": "business",
          "status": "active"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

#### POST /api/v1/enterprise-admin/users
Create new user.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request:**
```json
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "temporaryPassword123",
  "roleId": 2,
  "subscriptionPlan": "basic"
}
```

### Analytics Endpoints

#### GET /api/v1/enterprise-admin/analytics/overview
Get analytics overview data.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Query Parameters:**
- `dateRange`: Date range (7d, 30d, 90d)
- `metrics`: Specific metrics to include

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1000,
      "active": 850,
      "new": 50
    },
    "sessions": {
      "total": 5000,
      "averageDuration": 300
    },
    "performance": {
      "averageResponseTime": 150,
      "uptime": 99.9
    }
  }
}
```

### Security Endpoints

#### GET /api/v1/enterprise-admin/security/incidents
Get security incidents.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "data": {
    "incidents": [
      {
        "id": 1,
        "type": "failed_login",
        "severity": "medium",
        "description": "Multiple failed login attempts",
        "timestamp": "2025-01-01T00:00:00.000Z",
        "status": "resolved"
      }
    ]
  }
}
```

## Maintenance

### Regular Maintenance Tasks

**Daily:**
- Review system health
- Check error logs
- Monitor performance metrics
- Review security alerts

**Weekly:**
- Database backup verification
- User activity review
- Performance analysis
- Security scan

**Monthly:**
- Update dependencies
- Security audit
- Capacity planning
- Documentation updates

### Backup Procedures

**Automated Backups:**
```bash
# Daily database backup
0 2 * * * /usr/bin/npm run backup:create

# Weekly full system backup
0 3 * * 0 /usr/bin/npm run backup:full
```

**Manual Backup:**
```bash
# Create database backup
npm run backup:create -- --name=manual-backup-$(date +%Y%m%d)

# Create full system backup
npm run backup:full -- --name=full-backup-$(date +%Y%m%d)
```

### Updates and Upgrades

**Application Updates:**
```bash
# Update dependencies
npm update

# Run migrations
npm run migrate

# Restart services
sudo systemctl restart ulasis-admin
```

**Security Updates:**
```bash
# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update system packages
sudo apt update && sudo apt upgrade
```

---

## Conclusion

This Enterprise Admin Dashboard provides a comprehensive, secure, and scalable solution for managing the Ulasis platform. Regular maintenance, security monitoring, and user training are essential for optimal performance and security.

For additional support or questions, please refer to the contact information in the Support Resources section or contact your system administrator.