# Database Schema Documentation

## Overview

This document describes the complete database schema for the Ulasis feedback management system, designed with unlimited data retention across all subscription plans.

## Database Design Principles

### Unlimited Data Retention
- **No automatic data expiration** - All data is retained indefinitely regardless of subscription plan
- **Performance optimization** - Proper indexing for efficient queries with large datasets
- **Future archiving** - Schema designed to support future archiving strategies without data loss

### Data Integrity
- Foreign key constraints ensure referential integrity
- Proper indexing for performance optimization
- Audit fields for tracking data lifecycle

## Table Schema

### 1. users

User account management with subscription plans and authentication.

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    subscription_plan ENUM('free', 'starter', 'business') DEFAULT 'free',
    subscription_status ENUM('active', 'inactive', 'suspended', 'cancelled') DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires DATETIME,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_subscription_plan (subscription_plan),
    INDEX idx_email_verification_token (email_verification_token),
    INDEX idx_password_reset_token (password_reset_token)
);
```

**Fields Description:**
- `id`: Primary key
- `email`: Unique email address for user authentication
- `password_hash`: Bcrypt hash of user password
- `subscription_plan`: User's subscription tier (free/starter/business)
- `subscription_status`: Current status of subscription
- `email_verified`: Whether user has verified their email address
- `email_verification_token`: Token for email verification
- `password_reset_token`: Token for password reset functionality
- `password_reset_expires`: Expiration time for password reset token
- `last_login`: Timestamp of last user login

### 2. questionnaires

Survey management with user-defined categories and metadata.

```sql
CREATE TABLE questionnaires (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_mapping JSON,
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE,
    welcome_message TEXT,
    thank_you_message TEXT,
    logo_url VARCHAR(500),
    theme_config JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active),
    INDEX idx_is_public (is_public),
    INDEX idx_created_at (created_at)
);
```

**Fields Description:**
- `id`: Primary key
- `user_id`: Foreign key to users table
- `title`: Questionnaire title
- `description`: Detailed description of the questionnaire
- `category_mapping`: JSON object mapping questions to categories
- `is_active`: Whether questionnaire is currently active
- `is_public`: Whether questionnaire is publicly accessible
- `welcome_message`: Message shown to users before starting
- `thank_you_message`: Message shown after completion
- `logo_url`: URL for questionnaire logo
- `theme_config`: JSON object for theme customization

### 3. questions

Individual questions within questionnaires with various question types.

```sql
CREATE TABLE questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    questionnaire_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('text', 'rating', 'multiple_choice', 'checkbox', 'dropdown') NOT NULL,
    category VARCHAR(100),
    is_required BOOLEAN DEFAULT FALSE,
    question_order INT NOT NULL,
    options JSON,
    validation_rules JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id) ON DELETE CASCADE,
    INDEX idx_questionnaire_id (questionnaire_id),
    INDEX idx_question_order (question_order),
    INDEX idx_category (category),
    INDEX idx_question_type (question_type)
);
```

**Fields Description:**
- `id`: Primary key
- `questionnaire_id`: Foreign key to questionnaires table
- `question_text`: The actual question text
- `question_type`: Type of question (text, rating, multiple choice, etc.)
- `category`: Category for grouping and analysis
- `is_required`: Whether this question must be answered
- `question_order`: Order of question in questionnaire
- `options`: JSON array of options for multiple choice/checkbox questions
- `validation_rules`: JSON object with validation rules

### 4. qr_codes

QR code generation and tracking for questionnaire access.

```sql
CREATE TABLE qr_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    questionnaire_id INT NOT NULL,
    qr_code_data VARCHAR(1000) NOT NULL UNIQUE,
    location_tag VARCHAR(255),
    logo_url VARCHAR(500),
    custom_colors JSON,
    scan_count INT DEFAULT 0,
    last_scanned DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id) ON DELETE CASCADE,
    INDEX idx_questionnaire_id (questionnaire_id),
    INDEX idx_location_tag (location_tag),
    INDEX idx_is_active (is_active),
    INDEX idx_scan_count (scan_count)
);
```

**Fields Description:**
- `id`: Primary key
- `questionnaire_id`: Foreign key to questionnaires table
- `qr_code_data`: Encoded QR code data
- `location_tag`: Physical location where QR code is placed
- `logo_url`: Custom logo for QR code
- `custom_colors`: JSON object for QR code customization
- `scan_count`: Number of times this QR code has been scanned
- `last_scanned`: Timestamp of last scan
- `is_active`: Whether QR code is currently active

### 5. responses

Anonymous feedback submissions with device tracking.

```sql
CREATE TABLE responses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    questionnaire_id INT NOT NULL,
    qr_code_id INT,
    response_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    device_fingerprint VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer VARCHAR(500),
    session_id VARCHAR(255),
    completion_time_seconds INT,
    is_complete BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id) ON DELETE CASCADE,
    FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE SET NULL,
    INDEX idx_questionnaire_id (questionnaire_id),
    INDEX idx_qr_code_id (qr_code_id),
    INDEX idx_response_date (response_date),
    INDEX idx_device_fingerprint (device_fingerprint),
    INDEX idx_is_complete (is_complete)
);
```

**Fields Description:**
- `id`: Primary key
- `questionnaire_id`: Foreign key to questionnaires table
- `qr_code_id`: Foreign key to qr_codes table (nullable)
- `response_date`: When the response was submitted
- `device_fingerprint`: Unique identifier for device tracking
- `ip_address`: IP address of respondent
- `user_agent`: Browser user agent string
- `referrer`: Referrer URL if available
- `session_id`: Session identifier for tracking
- `completion_time_seconds`: Time taken to complete questionnaire
- `is_complete`: Whether response was fully completed

### 6. answers

Individual question responses linked to feedback submissions.

```sql
CREATE TABLE answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    response_id INT NOT NULL,
    question_id INT NOT NULL,
    answer_value TEXT,
    rating_score INT,
    answer_order INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    INDEX idx_response_id (response_id),
    INDEX idx_question_id (question_id),
    INDEX idx_rating_score (rating_score),
    UNIQUE KEY unique_response_question (response_id, question_id)
);
```

**Fields Description:**
- `id`: Primary key
- `response_id`: Foreign key to responses table
- `question_id`: Foreign key to questions table
- `answer_value`: Text value of the answer
- `rating_score`: Numeric rating for rating-type questions
- `answer_order`: Order for multi-select answers
- Unique constraint ensures one answer per question per response

### 7. reviews

Manual review processing for feedback moderation and analysis.

```sql
CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    response_id INT,
    review_status ENUM('pending', 'approved', 'rejected', 'flagged') DEFAULT 'pending',
    admin_notes TEXT,
    flagged_reason VARCHAR(255),
    reviewed_by INT,
    reviewed_at DATETIME,
    auto_flagged BOOLEAN DEFAULT FALSE,
    flag_score DECIMAL(3,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_response_id (response_id),
    INDEX idx_review_status (review_status),
    INDEX idx_reviewed_at (reviewed_at),
    INDEX idx_auto_flagged (auto_flagged)
);
```

**Fields Description:**
- `id`: Primary key
- `user_id`: Foreign key to users table (who requested review)
- `response_id`: Foreign key to responses table
- `review_status`: Current status of review
- `admin_notes`: Notes added by reviewing admin
- `flagged_reason`: Reason why response was flagged
- `reviewed_by`: Foreign key to users table (who reviewed)
- `reviewed_at`: When review was completed
- `auto_flagged`: Whether automatically flagged by system
- `flag_score`: Confidence score for automatic flagging

## Relationships

### Entity Relationship Diagram

```
users (1) -----> (N) questionnaires
users (1) -----> (N) reviews (as reviewer)
users (1) -----> (N) reviews (as requester)

questionnaires (1) -----> (N) questions
questionnaires (1) -----> (N) qr_codes
questionnaires (1) -----> (N) responses

questions (1) -----> (N) answers

qr_codes (1) -----> (N) responses

responses (1) -----> (N) answers
responses (1) -----> (1) reviews
```

### Cascade Rules
- **CASCADE DELETE**: When a user is deleted, all their questionnaires and reviews are deleted
- **CASCADE DELETE**: When a questionnaire is deleted, all questions, qr_codes, and responses are deleted
- **CASCADE DELETE**: When a response is deleted, all answers are deleted
- **SET NULL**: When a qr_code is deleted, response.qr_code_id is set to NULL

## Indexing Strategy

### Primary Indexes
- All tables have auto-increment primary keys for optimal performance

### Foreign Key Indexes
- All foreign key columns are indexed for fast JOIN operations

### Performance Indexes
- `users.email` - Fast user lookup during authentication
- `questionnaires.user_id` - Fast retrieval of user's questionnaires
- `responses.questionnaire_id` - Fast analytics queries
- `responses.response_date` - Time-based analytics
- `answers.response_id` - Fast answer retrieval for responses

### Composite Indexes
- `answers(response_id, question_id)` - Unique constraint for data integrity

## Data Retention Policy

### Unlimited Retention
- **No automatic deletion** of any data regardless of subscription plan
- **No data expiration** timestamps or cleanup jobs
- **Full audit trail** maintained for all records

### Performance Considerations
- Proper indexing ensures performance with large datasets
- Consider future archiving strategies for very old data
- Partitioning strategy can be implemented for tables with high volume

### Compliance
- GDPR compliance through user-controlled data deletion
- Audit trail maintained for all data modifications
- Secure storage of sensitive information (passwords, PII)

## Migration Process

### Running Migrations
```bash
# Run all pending migrations
npm run migrate

# Run specific migration
npm run migrate -- --migration 001-create-users.js

# Check migration status
npm run migrate:status
```

### Rollback Process
```bash
# Rollback last migration
npm run migrate:rollback

# Rollback to specific migration
npm run migrate:rollback -- --to 001-create-users.js
```

### Migration Files
- Migrations are numbered sequentially (001, 002, etc.)
- Each migration includes `up()` and `down()` methods
- All migrations are tested for rollback compatibility

## Security Considerations

### Data Protection
- Passwords are stored as bcrypt hashes
- PII is properly indexed and secured
- Database connections use SSL/TLS when available

### Access Control
- Database access controlled through environment variables
- Connection pooling prevents connection exhaustion
- Query parameterization prevents SQL injection

### Audit Trail
- All tables include `created_at` and `updated_at` timestamps
- Foreign key relationships maintain data integrity
- Review system tracks all manual data modifications