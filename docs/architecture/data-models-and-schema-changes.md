# Data Models and Schema Changes

## New Data Models

### users
**Purpose:** User account management with subscription plans and authentication  
**Integration:** Core model for authentication, subscription enforcement, and data ownership

**Key Attributes:**
- id: INTEGER PRIMARY KEY - Unique user identifier
- email: VARCHAR(255) UNIQUE - User email (login identifier)
- password_hash: VARCHAR(255) - Encrypted password
- first_name: VARCHAR(100) - User first name
- last_name: VARCHAR(100) - User last name
- subscription_plan: ENUM('free', 'starter', 'business') - Current subscription tier
- subscription_status: ENUM('active', 'inactive', 'suspended') - Subscription status
- email_verified: BOOLEAN - Email verification status
- created_at: TIMESTAMP - Account creation timestamp
- updated_at: TIMESTAMP - Last update timestamp

**Relationships:**
- **With Existing:** One-to-many with questionnaires, qr_codes
- **With New:** One-to-many with responses, reviews

### questionnaires
**Purpose:** Survey/questionnaire management with user-defined categories  
**Integration:** Core model for feedback collection and analytics

**Key Attributes:**
- id: INTEGER PRIMARY KEY - Unique questionnaire identifier
- user_id: INTEGER FOREIGN KEY - Owner user ID
- title: VARCHAR(255) - Questionnaire title
- description: TEXT - Questionnaire description
- category_mapping: JSON - User-defined category assignments
- is_active: BOOLEAN - Questionnaire active status
- created_at: TIMESTAMP - Creation timestamp
- updated_at: TIMESTAMP - Last update timestamp

**Relationships:**
- **With Existing:** One-to-many with questions, qr_codes
- **With New:** One-to-many with responses

### questions
**Purpose:** Individual questions within questionnaires  
**Integration:** Supports anonymous feedback collection

**Key Attributes:**
- id: INTEGER PRIMARY KEY - Unique question identifier
- questionnaire_id: INTEGER FOREIGN KEY - Parent questionnaire ID
- question_text: TEXT - Question content
- question_type: ENUM('rating', 'text', 'multiple_choice') - Question type
- category: VARCHAR(100) - User-defined category
- is_required: BOOLEAN - Required response flag
- order_index: INTEGER - Display order

**Relationships:**
- **With Existing:** Many-to-one with questionnaires
- **With New:** One-to-many with answers

### qr_codes
**Purpose:** QR code generation and tracking with location tags  
**Integration:** Enables anonymous response collection

**Key Attributes:**
- id: INTEGER PRIMARY KEY - Unique QR code identifier
- questionnaire_id: INTEGER FOREIGN KEY - Linked questionnaire ID
- qr_code_data: TEXT - Encoded QR data
- location_tag: VARCHAR(255) - User-defined location
- logo_url: VARCHAR(500) - Optional logo image URL
- scan_count: INTEGER - Scan tracking counter
- created_at: TIMESTAMP - Creation timestamp

**Relationships:**
- **With Existing:** Many-to-one with questionnaires
- **With New:** One-to-many with responses

### responses
**Purpose:** Individual feedback submissions from anonymous users  
**Integration:** Core data for analytics and bubble visualization

**Key Attributes:**
- id: INTEGER PRIMARY KEY - Unique response identifier
- questionnaire_id: INTEGER FOREIGN KEY - Source questionnaire ID
- qr_code_id: INTEGER FOREIGN KEY - Source QR code ID
- response_date: TIMESTAMP - Submission timestamp
- device_fingerprint: VARCHAR(255) - Anonymous tracking identifier
- ip_address: VARCHAR(45) - Submission IP for spam protection

**Relationships:**
- **With Existing:** Many-to-one with questionnaires, qr_codes
- **With New:** One-to-many with answers

### answers
**Purpose:** Individual question responses within feedback submissions  
**Integration:** Provides measurable data for analytics

**Key Attributes:**
- id: INTEGER PRIMARY KEY - Unique answer identifier
- response_id: INTEGER FOREIGN KEY - Parent response ID
- question_id: INTEGER FOREIGN KEY - Source question ID
- answer_value: TEXT - Response content
- rating_score: INTEGER - Numeric rating (1-5)
- created_at: TIMESTAMP - Answer timestamp

**Relationships:**
- **With Existing:** Many-to-one with responses, questions
- **With New:** Used in analytics calculations

### reviews
**Purpose:** Manual review processing and management  
**Integration:** Supports review management system

**Key Attributes:**
- id: INTEGER PRIMARY KEY - Unique review identifier
- user_id: INTEGER FOREIGN KEY - Owner user ID
- response_id: INTEGER FOREIGN KEY - Source response ID
- review_status: ENUM('pending', 'approved', 'rejected') - Review status
- admin_notes: TEXT - Administrative notes
- processed_at: TIMESTAMP - Processing timestamp

**Relationships:**
- **With Existing:** Many-to-one with users, responses
- **With New:** Integration with admin dashboard

## Schema Integration Strategy

**Database Changes Required:**
- **New Tables:** users, questionnaires, questions, qr_codes, responses, answers, reviews
- **Modified Tables:** None (greenfield database implementation)
- **New Indexes:** Primary keys, foreign keys, email uniqueness, subscription indexes
- **Migration Strategy:** Sequelize migrations with version control and rollback capability

**Backward Compatibility:**
- Frontend TypeScript interfaces remain unchanged
- API response formats match existing component expectations
- UI components require only API endpoint changes
- No breaking changes to existing user experience
