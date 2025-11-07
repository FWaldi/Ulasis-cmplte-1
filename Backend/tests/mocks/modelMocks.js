// Simplified model mocks extracted from setup.js

// Track usage per user for more accurate testing
const mockUserUsageCounts = new Map();

// Add QR code state tracking for logo upload tests
const mockQRCodes = new Map();

// Add quota tracking variables outside of mock
let mockQuestionnaireCreationCount = 0;
const mockDeletedQuestionnaires = new Set();

// Add questionnaire storage for proper test isolation
const mockQuestionnaires = new Map();

// Track created questions for proper test isolation
const createdQuestions = new Map();

// Track deleted questions for proper test isolation
const deletedQuestions = new Set();

// Export function to reset mock state for tests
global.resetMockQuestionnaireCount = function() {
  mockQuestionnaireCreationCount = 0;
  mockUserUsageCounts.clear();
  mockQuestionnaires.clear();
  deletedQuestions.clear();
  createdQuestions.clear();
};

// Create mock question factory
const createMockQuestion = (overrides = {}) => {
  const question = {
    id: overrides.id || 1,
    questionnaireId: overrides.questionnaireId || 1,
    questionText: overrides.questionText || 'Test question',
    questionType: overrides.questionType || 'text',
    category: overrides.category || 'test',
    isRequired: overrides.isRequired !== undefined ? overrides.isRequired : false,
    orderIndex: overrides.orderIndex || 1,
    configuration: overrides.configuration || {},
    options: overrides.options || [],
    validationRules: overrides.validationRules || {},
    placeholder: overrides.placeholder || '',
    helpText: overrides.helpText || '',
    maxLength: overrides.maxLength || null,
    minValue: overrides.minValue || null,
    maxValue: overrides.maxValue || null,
    settings: overrides.settings || {},
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    save: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockImplementation(function() {
      // Track this question as deleted
      deletedQuestions.add(this.id);
      return Promise.resolve(true);
    }),
    update: jest.fn().mockImplementation(function(data) {
      Object.assign(this, data);
      if (data.orderIndex !== undefined) {
        this.orderIndex = data.orderIndex;
      }
      return Promise.resolve([1]);
    }),
    validateConfiguration: jest.fn().mockImplementation(function() {
      let options = this.options;
      if (options && typeof options === 'object' && !Array.isArray(options)) {
        const keys = Object.keys(options).map(k => parseInt(k)).filter(k => !isNaN(k));
        if (keys.length > 0) {
          keys.sort((a, b) => a - b);
          options = keys.map(k => options[k.toString()]);
          this.options = options;
        }
      }
      return { isValid: true, errors: [] };
    }),
    toJSON: jest.fn().mockImplementation(function() {
      return {
        id: this.id,
        questionnaireId: this.questionnaireId,
        questionText: this.questionText,
        questionType: this.questionType,
        category: this.category,
        isRequired: this.isRequired,
        orderIndex: this.orderIndex,
        configuration: this.configuration,
        options: this.options,
        validationRules: this.validationRules,
        placeholder: this.placeholder,
        helpText: this.helpText,
        maxLength: this.maxLength,
        minValue: this.minValue,
        maxValue: this.maxValue,
        settings: this.settings,
        isActive: this.isActive,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    }),
    toSummaryJSON: jest.fn().mockImplementation(function() {
      return {
        id: this.id,
        questionnaireId: this.questionnaireId,
        questionText: this.questionText,
        questionType: this.questionType,
        category: this.category,
        isRequired: this.isRequired,
        orderIndex: this.orderIndex,
        configuration: this.configuration,
        options: this.options,
        isActive: this.isActive,
      };
    }),
  };
  return question;
};

// Create mock QR code factory
const createMockQRCode = (overrides = {}) => {
  const newId = overrides.id || mockQRCodes.size + 1;
  const qrCode = {
    id: newId,
    questionnaireId: overrides.questionnaireId || 1,
    qrCodeData: overrides.qrCodeData || 'test-qr-data',
    locationTag: overrides.locationTag || 'Test Location',
    scanCount: 0,
    uniqueScans: 0,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    logoUrl: overrides.logoUrl || null,
    customColors: overrides.customColors || null,
    deletedAt: null,
    questionnaire: {
      id: overrides.questionnaireId || 1,
      userId: overrides.userId || 1,
      title: 'Test Questionnaire for Setup',
    },
    save: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockImplementation(function() {
      this.deletedAt = new Date();
      // Ensure questionnaire association is preserved for soft delete
      if (!this.questionnaire) {
        this.questionnaire = {
          id: this.questionnaireId,
          userId: 1, // Default user ID for tests
          title: 'Test Questionnaire',
        };
      }
      // Store with both string and number keys for robust lookup
      mockQRCodes.set(this.id, this);
      mockQRCodes.set(String(this.id), this);
      return Promise.resolve(1);
    }),
    update: jest.fn().mockImplementation(function(data) {
      Object.assign(this, data);
      if (data.logoUrl !== undefined) {
        this.logoUrl = data.logoUrl;
      }
      mockQRCodes.set(this.id, this);
      return Promise.resolve([1]);
    }),
    isValid: jest.fn().mockImplementation(function() {
      return this.isActive && (!this.expiresAt || new Date(this.expiresAt) > new Date());
    }),
    incrementScan: jest.fn().mockImplementation(function() {
      this.scanCount = (this.scanCount || 0) + 1;
      this.uniqueScans = (this.uniqueScans || 0) + 1;
      this.lastScanAt = new Date();
      mockQRCodes.set(this.id, this);
      return Promise.resolve(this);
    }),
    toSummaryJSON: jest.fn().mockImplementation(function() {
      return {
        id: this.id,
        questionnaireId: this.questionnaireId,
        qrCodeData: this.qrCodeData,
        locationTag: this.locationTag,
        scanCount: this.scanCount,
        uniqueScans: this.uniqueScans,
        isActive: this.isActive,
        logoUrl: this.logoUrl,
        customColors: this.customColors,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }),
    toJSON: jest.fn().mockImplementation(function() {
      return {
        id: this.id,
        questionnaireId: this.questionnaireId,
        qrCodeData: this.qrCodeData,
        locationTag: this.locationTag,
        scanCount: this.scanCount,
        uniqueScans: this.uniqueScans,
        isActive: this.isActive,
        logoUrl: this.logoUrl,
        customColors: this.customColors,
      };
    }),
  };

  mockQRCodes.set(qrCode.id, qrCode);
  return qrCode;
};

// Create mock questionnaire factory
const createMockQuestionnaire = (overrides = {}) => {
  const questionnaire = {
    id: overrides.id || 1,
    userId: overrides.userId || 1,
    title: overrides.title || 'Test Questionnaire for Setup',
    description: overrides.description || 'Test description',
    categoryMapping: overrides.categoryMapping || {},
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    isPublic: overrides.isPublic !== undefined ? overrides.isPublic : false,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    save: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockImplementation(function() {
      mockDeletedQuestionnaires.add(this.id.toString());
      return Promise.resolve(1);
    }),
    update: jest.fn().mockImplementation(function(data) {
      Object.assign(this, data);
      this.updatedAt = new Date();
      return Promise.resolve([1, [this]]);
    }),
    toJSON: jest.fn().mockImplementation(function() {
      return {
        id: this.id,
        userId: this.userId,
        title: this.title,
        description: this.description,
        categoryMapping: this.categoryMapping,
        isActive: this.isActive,
        isPublic: this.isPublic,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    }),
    toSummaryJSON: jest.fn().mockImplementation(function() {
      return {
        id: this.id,
        userId: this.userId,
        title: this.title,
        description: this.description,
        categoryMapping: this.categoryMapping,
        isActive: this.isActive,
        isPublic: this.isPublic,
      };
    }),
  };
  return questionnaire;
};

// Create mock response factory
const createMockResponse = (overrides = {}) => {
  return {
    id: 1,
    ...overrides,
    save: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue([1]),
    toJSON: jest.fn().mockReturnValue({ id: 1, ...overrides }),
  };
};

// Create mock answer factory
const createMockAnswer = (overrides = {}) => {
  return {
    id: 1,
    ...overrides,
    save: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue([1]),
    toJSON: jest.fn().mockReturnValue({ id: 1, ...overrides }),
    validateAgainstQuestion: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  };
};

// Create mock notification history factory
const createMockNotificationHistory = (overrides = {}) => {
  return {
    id: 1,
    user_id: overrides.user_id || 1,
    notification_type: overrides.notification_type || 'test',
    email_subject: overrides.email_subject || 'Test Subject',
    email_status: overrides.email_status || 'queued',
    sent_at: overrides.sent_at || null,
    delivered_at: overrides.delivered_at || null,
    created_at: new Date(),
    save: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue([1]),
    toJSON: jest.fn().mockReturnValue({ id: 1, ...overrides }),
  };
};

// Create mock audit log factory
const createMockAuditLog = (overrides = {}) => {
  return {
    id: 1,
    user_id: overrides.user_id || 1,
    action: overrides.action || 'test',
    resource_type: overrides.resource_type || 'test',
    resource_id: overrides.resource_id || null,
    details: overrides.details || {},
    ip_address: overrides.ip_address || '127.0.0.1',
    user_agent: overrides.user_agent || 'Test User Agent',
    created_at: new Date(),
    save: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue([1]),
    toJSON: jest.fn().mockReturnValue({ id: 1, ...overrides }),
  };
};

// Create mock subscription usage factory
const createMockSubscriptionUsage = (overrides = {}) => {
  return {
    id: 1,
    user_id: overrides.user_id || 1,
    usage_type: overrides.usage_type || 'questionnaires',
    current_count: overrides.current_count || 0,
    limit_count: overrides.limit_count || 1,
    save: jest.fn().mockImplementation(function() {
      if (overrides.usage_type === 'questionnaires' && this.current_count !== undefined) {
        const userId = overrides.user_id;
        if (userId) {
          mockUserUsageCounts.set(userId, this.current_count);
        }
      }
      return Promise.resolve(true);
    }),
    destroy: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue([1]),
    toJSON: jest.fn().mockReturnValue({ id: 1, ...overrides }),
  };
};

// Create mock payment transaction factory
const createMockPaymentTransaction = (overrides = {}) => {
  return {
    id: 1,
    user_id: overrides.user_id || 1,
    payment_method: overrides.payment_method || 'dana',
    amount: overrides.amount || 99000,
    currency: overrides.currency || 'IDR',
    status: overrides.status || 'pending',
    subscription_plan: overrides.subscription_plan || 'starter',
    save: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue([1]),
    toJSON: jest.fn().mockReturnValue({ id: 1, ...overrides }),
  };
};

// Create mock notification preference factory
const createMockNotificationPreference = (overrides = {}) => {
  return {
    id: 1,
    user_id: overrides.user_id || 1,
    email_notifications: overrides.email_notifications !== undefined ? overrides.email_notifications : true,
    new_review_alerts: overrides.new_review_alerts !== undefined ? overrides.new_review_alerts : true,
    subscription_updates: overrides.subscription_updates !== undefined ? overrides.subscription_updates : true,
    account_security: overrides.account_security !== undefined ? overrides.account_security : true,
    save: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue([1]),
    toJSON: jest.fn().mockReturnValue({ id: 1, ...overrides }),
  };
};

module.exports = {
  mockUserUsageCounts,
  mockQRCodes,
  mockDeletedQuestionnaires,
  mockQuestionnaires,
  mockQuestionnaireCreationCount,
  createMockQuestionnaire,
  createMockResponse,
  createMockPaymentTransaction,
  createMockNotificationPreference,
  createMockQuestion,
  createMockQRCode,
  createMockAnswer,
  createMockNotificationHistory,
  createMockAuditLog,
  createMockSubscriptionUsage,
  resetMockQuestionnaireCount,
};