# Enterprise Admin API Reference

## Base URL

```
Production: https://admin.yourdomain.com/api/v1/enterprise-admin
Development: http://localhost:3001/api/v1/enterprise-admin
```

## Authentication

All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Response Format

All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  },
  "timestamp": "2025-01-01T00:00:00.000Z",
  "requestId": "req_123456789"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": {
    // Additional error details (optional)
  },
  "timestamp": "2025-01-01T00:00:00.000Z",
  "requestId": "req_123456789"
}
```

---

## Authentication Endpoints

### POST /login

Authenticate admin user and receive JWT token.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123",
  "twoFactorToken": "123456",  // Optional, required if 2FA enabled
  "rememberMe": false            // Optional
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Admin login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "adminUser": {
      "id": 1,
      "user": {
        "id": 1,
        "email": "admin@example.com",
        "firstName": "Admin",
        "lastName": "User"
      },
      "role": {
        "id": 1,
        "name": "Super Admin",
        "permissions": ["*"],
        "level": 10
      },
      "permissions": ["*"],
      "lastLogin": "2025-01-01T00:00:00.000Z",
      "twoFactorEnabled": false
    },
    "session": {
      "sessionId": "admin_1234567890_abcdef",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Invalid Credentials",
  "message": "The email or password is incorrect"
}
```

**Response (200 OK - 2FA Required):**
```json
{
  "success": true,
  "requiresTwoFactor": true,
  "message": "Two-factor authentication token required"
}
```

### POST /logout

Logout admin user and invalidate session.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Admin logout successful"
}
```

### POST /refresh-token

Refresh JWT token for extended session.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2025-01-01T08:00:00.000Z"
  }
}
```

### GET /session

Get current session information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "session": {
      "sessionId": "admin_1234567890_abcdef",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "lastActivity": "2025-01-01T00:30:00.000Z",
      "ipAddress": "192.168.1.100",
      "twoFactorVerified": true
    },
    "adminUser": {
      "id": 1,
      "email": "admin@example.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": {
        "name": "Super Admin",
        "permissions": ["*"]
      },
      "permissions": ["*"],
      "twoFactorEnabled": false
    }
  }
}
```

---

## Two-Factor Authentication

### POST /2fa/setup

Initiate two-factor authentication setup.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Two-factor authentication setup initiated",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "backupCodes": [],
    "instructions": [
      "Scan the QR code with your authenticator app",
      "Enter the verification code to complete setup",
      "Save the backup codes in a secure location"
    ]
  }
}
```

### POST /2fa/verify-enable

Verify and enable two-factor authentication.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "token": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Two-factor authentication enabled successfully"
}
```

### POST /2fa/disable

Disable two-factor authentication.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "password": "current_password",
  "token": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Two-factor authentication disabled successfully"
}
```

---

## Dashboard

### GET /dashboard

Get dashboard overview data.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `timeRange`: `1d`, `7d`, `30d`, `90d` (default: `7d`)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 1250,
      "activeUsers": 980,
      "newUsers": 45,
      "totalSessions": 5420,
      "averageSessionDuration": 325
    },
    "systemHealth": {
      "status": "healthy",
      "uptime": 99.9,
      "responseTime": 145,
      "errorRate": 0.2
    },
    "recentActivity": [
      {
        "id": 1,
        "type": "user_login",
        "description": "User john@example.com logged in",
        "timestamp": "2025-01-01T00:00:00.000Z",
        "severity": "info"
      }
    ],
    "alerts": [
      {
        "id": 1,
        "type": "security",
        "title": "Multiple failed login attempts",
        "description": "5 failed attempts from IP 192.168.1.100",
        "severity": "medium",
        "timestamp": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## User Management

### GET /users

Get paginated list of users.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page`: Page number (default: `1`)
- `limit`: Items per page (default: `20`, max: `100`)
- `search`: Search term (email, name)
- `status`: Filter by status (`active`, `inactive`, `suspended`)
- `role`: Filter by role ID
- `subscription`: Filter by subscription plan
- `sortBy`: Sort field (`email`, `createdAt`, `lastLogin`)
- `sortOrder`: Sort order (`asc`, `desc`)

**Response (200 OK):**
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
          "status": "active",
          "expiresAt": "2025-02-01T00:00:00.000Z"
        },
        "lastLogin": "2025-01-01T00:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1250,
      "totalPages": 63,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### GET /users/:id

Get detailed information about a specific user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true,
      "subscription": {
        "plan": "business",
        "status": "active",
        "expiresAt": "2025-02-01T00:00:00.000Z",
        "features": ["advanced_analytics", "api_access"]
      },
      "profile": {
        "phone": "+1234567890",
        "company": "Acme Corp",
        "avatar": "https://example.com/avatar.jpg"
      },
      "statistics": {
        "totalLogins": 145,
        "lastLogin": "2025-01-01T00:00:00.000Z",
        "averageSessionDuration": 325,
        "totalResponses": 89
      },
      "activity": [
        {
          "type": "login",
          "description": "User logged in",
          "timestamp": "2025-01-01T00:00:00.000Z",
          "ipAddress": "192.168.1.100"
        }
      ]
    }
  }
}
```

### POST /users

Create a new user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "temporaryPassword123",
  "roleId": 2,
  "subscriptionPlan": "basic",
  "sendWelcomeEmail": true,
  "profile": {
    "phone": "+1234567890",
    "company": "New Company"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": 2,
      "email": "newuser@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "isActive": true,
      "subscription": {
        "plan": "basic",
        "status": "active"
      }
    }
  }
}
```

### PUT /users/:id

Update user information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "firstName": "Updated Name",
  "lastName": "Updated Last Name",
  "isActive": true,
  "subscription": {
    "plan": "business"
  },
  "profile": {
    "phone": "+1234567890",
    "company": "Updated Company"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "Updated Name",
      "lastName": "Updated Last Name",
      "isActive": true
    }
  }
}
```

### DELETE /users/:id

Delete a user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### POST /users/bulk

Perform bulk operations on users.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "action": "deactivate",  // deactivate, activate, delete, export
  "userIds": [1, 2, 3, 4, 5],
  "filters": {
    "status": "inactive",
    "subscription": "expired"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bulk operation completed successfully",
  "data": {
    "processed": 5,
    "successful": 5,
    "failed": 0,
    "errors": []
  }
}
```

### GET /users/export

Export user data.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `format`: `csv`, `json`, `xlsx` (default: `csv`)
- `fields`: Comma-separated list of fields
- `filters`: JSON-encoded filter object

**Response (200 OK):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="users_export_20250101.csv"

id,email,firstName,lastName,isActive,subscription
1,user@example.com,John,Doe,true,business
```

---

## Analytics

### GET /analytics/overview

Get analytics overview data.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `dateRange`: `7d`, `30d`, `90d`, `1y` (default: `30d`)
- `metrics`: Comma-separated list of metrics

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "active": 980,
      "new": 45,
      "retention": 78.4
    },
    "sessions": {
      "total": 5420,
      "averageDuration": 325,
      "bounceRate": 23.5
    },
    "performance": {
      "averageResponseTime": 145,
      "uptime": 99.9,
      "errorRate": 0.2
    },
    "business": {
      "revenue": 15420.50,
      "subscriptions": {
        "basic": 850,
        "business": 350,
        "enterprise": 50
      }
    }
  }
}
```

### GET /analytics/users

Get user analytics data.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `dateRange`: Date range
- `groupBy`: `day`, `week`, `month` (default: `day`)
- `metric`: `registrations`, `active`, `retention`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "date": "2025-01-01",
        "registrations": 12,
        "active": 980,
        "retention": 78.4
      }
    ],
    "demographics": {
      "countries": [
        {"country": "United States", "count": 450},
        {"country": "United Kingdom", "count": 230}
      ],
      "devices": [
        {"device": "Desktop", "count": 850},
        {"device": "Mobile", "count": 400}
      ]
    }
  }
}
```

### GET /analytics/performance

Get performance analytics.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "responseTime": {
      "average": 145,
      "p50": 120,
      "p95": 280,
      "p99": 450
    },
    "endpoints": [
      {
        "path": "/api/v1/auth/login",
        "averageResponseTime": 120,
        "requestCount": 15420,
        "errorRate": 0.1
      }
    ],
    "resources": {
      "cpu": 45.2,
      "memory": 68.5,
      "disk": 32.1
    }
  }
}
```

---

## Security

### GET /security/incidents

Get security incidents and alerts.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `status`: `open`, `resolved`, `all` (default: `open`)
- `severity`: `low`, `medium`, `high`, `critical`
- `page`: Page number
- `limit`: Items per page

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "incidents": [
      {
        "id": 1,
        "type": "failed_login",
        "severity": "medium",
        "title": "Multiple failed login attempts",
        "description": "5 failed attempts from IP 192.168.1.100",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "status": "open",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "summary": {
      "total": 15,
      "open": 8,
      "resolved": 7,
      "critical": 2
    }
  }
}
```

### POST /security/incidents/:id/resolve

Resolve a security incident.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "resolution": "Blocked IP address and notified user",
  "action": "block_ip"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Incident resolved successfully"
}
```

### GET /security/audit-log

Get audit log entries.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `userId`: Filter by user ID
- `action`: Filter by action type
- `resource`: Filter by resource type
- `dateFrom`: Start date
- `dateTo`: End date
- `page`: Page number
- `limit`: Items per page

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": 1,
        "adminUserId": 1,
        "adminEmail": "admin@example.com",
        "action": "USER_UPDATE",
        "resourceType": "user",
        "resourceId": 123,
        "details": {
          "changes": ["status", "subscription"]
        },
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2025-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1250
    }
  }
}
```

---

## System Administration

### GET /system/health

Get system health status.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "services": {
      "database": {
        "status": "healthy",
        "responseTime": 5,
        "connections": 25
      },
      "redis": {
        "status": "healthy",
        "responseTime": 2,
        "memory": "45MB"
      },
      "email": {
        "status": "healthy",
        "lastDelivery": "2025-01-01T00:00:00.000Z"
      }
    },
    "metrics": {
      "uptime": 99.9,
      "responseTime": 145,
      "errorRate": 0.2,
      "requestsPerMinute": 125
    }
  }
}
```

### GET /system/metrics

Get detailed system metrics.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "server": {
      "cpu": 45.2,
      "memory": {
        "used": "4.2GB",
        "total": "8GB",
        "percentage": 52.5
      },
      "disk": {
        "used": "45GB",
        "total": "100GB",
        "percentage": 45.0
      }
    },
    "application": {
      "activeConnections": 125,
      "queueSize": 15,
      "cacheHitRate": 94.5
    },
    "database": {
      "connections": 25,
      "queryTime": 45,
      "slowQueries": 2
    }
  }
}
```

### POST /system/backup

Create system backup.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "type": "full",  // full, database, files
  "description": "Manual backup before update"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Backup initiated successfully",
  "data": {
    "backupId": "backup_20250101_120000",
    "status": "in_progress",
    "estimatedCompletion": "2025-01-01T00:05:00.000Z"
  }
}
```

### GET /system/backups

Get list of system backups.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "id": "backup_20250101_120000",
        "type": "full",
        "size": "1.2GB",
        "status": "completed",
        "createdAt": "2025-01-01T12:00:00.000Z",
        "description": "Manual backup before update"
      }
    ]
  }
}
```

---

## Settings

### GET /settings

Get system settings.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "application": {
      "name": "Ulasis Enterprise",
      "version": "1.0.0",
      "maintenance": false
    },
    "security": {
      "sessionTimeout": 480,
      "maxFailedAttempts": 5,
      "lockoutDuration": 15,
      "requireTwoFactor": false
    },
    "email": {
      "smtpHost": "smtp.example.com",
      "smtpPort": 587,
      "fromEmail": "noreply@example.com"
    }
  }
}
```

### PUT /settings

Update system settings.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "security": {
    "sessionTimeout": 600,
    "maxFailedAttempts": 5,
    "requireTwoFactor": true
  },
  "email": {
    "fromEmail": "admin@example.com"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| AUTH_001 | 401 | Invalid credentials |
| AUTH_002 | 401 | Account locked |
| AUTH_003 | 403 | Two-factor authentication required |
| AUTH_004 | 401 | Session expired |
| AUTH_005 | 401 | Invalid token |
| PERM_001 | 403 | Insufficient permissions |
| PERM_002 | 403 | Access denied |
| VAL_001 | 400 | Validation error |
| VAL_002 | 400 | Missing required field |
| VAL_003 | 400 | Invalid data format |
| RES_001 | 404 | Resource not found |
| RES_002 | 404 | User not found |
| SYS_001 | 500 | Internal server error |
| SYS_002 | 503 | Service unavailable |
| SYS_003 | 429 | Rate limit exceeded |
| SYS_004 | 503 | Database connection failed |

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Standard endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 10 requests per 15 minutes per IP
- **Sensitive operations**: 5 requests per 15 minutes per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## SDKs and Libraries

### JavaScript/TypeScript

```bash
npm install @ulasis/enterprise-admin-sdk
```

```javascript
import { EnterpriseAdminClient } from '@ulasis/enterprise-admin-sdk';

const client = new EnterpriseAdminClient({
  baseURL: 'https://admin.yourdomain.com/api/v1/enterprise-admin',
  token: 'your-jwt-token'
});

// Get users
const users = await client.users.list({ page: 1, limit: 20 });

// Create user
const user = await client.users.create({
  email: 'new@example.com',
  firstName: 'John',
  lastName: 'Doe'
});
```

### Python

```bash
pip install ulasis-enterprise-admin
```

```python
from ulasis_enterprise_admin import EnterpriseAdminClient

client = EnterpriseAdminClient(
    base_url='https://admin.yourdomain.com/api/v1/enterprise-admin',
    token='your-jwt-token'
)

# Get users
users = client.users.list(page=1, limit=20)

# Create user
user = client.users.create(
    email='new@example.com',
    first_name='John',
    last_name='Doe'
)
```

---

## Webhooks

Configure webhooks to receive real-time notifications:

### Supported Events

- `user.created`
- `user.updated`
- `user.deleted`
- `user.login`
- `security.incident`
- `system.backup_completed`

### Webhook Configuration

```json
{
  "url": "https://yourapp.com/webhooks/ulasis",
  "events": ["user.created", "user.updated"],
  "secret": "your-webhook-secret",
  "active": true
}
```

### Webhook Payload

```json
{
  "event": "user.created",
  "data": {
    "user": {
      "id": 123,
      "email": "new@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  },
  "timestamp": "2025-01-01T00:00:00.000Z",
  "signature": "sha256=5d41402abc4b2a76b9719d911017c592"
}
```

---

## Support

For API support and questions:

- **Documentation**: https://docs.ulasis.com/enterprise-admin
- **API Status**: https://status.ulasis.com
- **Support Email**: api-support@ulasis.com
- **Developer Community**: https://community.ulasis.com

---

*Last updated: January 1, 2025*