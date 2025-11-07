# API Design and Integration

## API Integration Strategy

**API Integration Strategy:** RESTful API implementation matching exactly the endpoint specifications in backend_requirements.txt with proper error handling, validation, and response formatting. Include subscription limitation enforcement.

**Authentication:** JWT-based authentication with secure token generation, refresh mechanisms, and middleware protection for sensitive endpoints.

**Versioning:** API versioning through URL prefixes (/api/v1/) to ensure future compatibility while maintaining current frontend integration.

## New API Endpoints

### Authentication Endpoints

#### POST /api/v1/auth/register
- **Method:** POST
- **Endpoint:** /api/v1/auth/register
- **Purpose:** User registration with email verification
- **Integration:** Creates user account, sends verification email

##### Request
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe"
}
```

##### Response
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for verification.",
  "data": {
    "user_id": 123,
    "email": "user@example.com",
    "subscription_plan": "free"
  }
}
```

#### POST /api/v1/auth/login
- **Method:** POST
- **Endpoint:** /api/v1/auth/login
- **Purpose:** User authentication with JWT token generation
- **Integration:** Validates credentials, returns access token

##### Request
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

##### Response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 123,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "subscription_plan": "free"
    }
  }
}
```

### Questionnaire Management Endpoints

#### GET /api/v1/questionnaires
- **Method:** GET
- **Endpoint:** /api/v1/questionnaires
- **Purpose:** Retrieve user's questionnaires with subscription limits
- **Integration:** Enforces subscription limitations, returns paginated results

##### Response
```json
{
  "success": true,
  "data": {
    "questionnaires": [
      {
        "id": 1,
        "title": "Customer Satisfaction Survey",
        "description": "Measure customer satisfaction",
        "category_mapping": {
          "service": ["q1", "q2"],
          "product": ["q3", "q4"]
        },
        "is_active": true,
        "created_at": "2025-10-26T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1
    },
    "usage": {
      "used": 1,
      "limit": 5,
      "plan": "starter"
    }
  }
}
```

#### POST /api/v1/questionnaires
- **Method:** POST
- **Endpoint:** /api/v1/questionnaires
- **Purpose:** Create new questionnaire with subscription validation
- **Integration:** Checks subscription limits, creates questionnaire with categories

##### Request
```json
{
  "title": "New Customer Feedback",
  "description": "Collect customer feedback",
  "category_mapping": {
    "service": ["q1", "q2"],
    "quality": ["q3", "q4"]
  }
}
```

##### Response
```json
{
  "success": true,
  "data": {
    "id": 2,
    "title": "New Customer Feedback",
    "description": "Collect customer feedback",
    "category_mapping": {
      "service": ["q1", "q2"],
      "quality": ["q3", "q4"]
    },
    "is_active": true,
    "created_at": "2025-10-26T11:00:00Z"
  }
}
```

### Analytics Endpoints

#### GET /api/v1/analytics/bubble/:questionnaireId
- **Method:** GET
- **Endpoint:** /api/v1/analytics/bubble/:questionnaireId
- **Purpose:** Generate bubble-based analytics for improvement areas
- **Integration:** Processes response data into measurable bubble visualization

##### Response
```json
{
  "success": true,
  "data": {
    "questionnaire_id": 1,
    "categories": [
      {
        "name": "service",
        "rating": 4.2,
        "response_count": 45,
        "response_rate": 0.78,
        "color": "green",
        "trend": "improving"
      },
      {
        "name": "product",
        "rating": 3.1,
        "response_count": 45,
        "response_rate": 0.78,
        "color": "yellow",
        "trend": "stable"
      }
    ],
    "period_comparison": {
      "current_period": "2025-10-20 to 2025-10-26",
      "previous_period": "2025-10-13 to 2025-10-19",
      "overall_trend": "improving"
    }
  }
}
```

### Anonymous Response Endpoints

#### POST /api/v1/responses/anonymous
- **Method:** POST
- **Endpoint:** /api/v1/responses/anonymous
- **Purpose:** Submit anonymous feedback without authentication
- **Integration:** Processes public form submissions, applies spam protection

##### Request
```json
{
  "questionnaire_id": 1,
  "qr_code_id": 5,
  "answers": [
    {
      "question_id": 1,
      "answer_value": "4",
      "rating_score": 4
    },
    {
      "question_id": 2,
      "answer_value": "The service was excellent",
      "rating_score": null
    }
  ]
}
```

##### Response
```json
{
  "success": true,
  "message": "Thank you for your feedback!",
  "data": {
    "response_id": 123,
    "submitted_at": "2025-10-26T12:00:00Z"
  }
}
```
