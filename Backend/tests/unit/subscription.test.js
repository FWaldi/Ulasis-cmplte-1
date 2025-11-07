// Import the service first
const subscriptionService = require('../../src/services/subscriptionService');

// Import models for mocking
const { User, SubscriptionUsage } = require('../../src/models');

// Mock the models before importing the service
jest.mock('../../src/models', () => ({
  User: {
    findByPk: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    update: jest.fn(),
  },
  SubscriptionUsage: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  // Add other models that might be needed
  Questionnaire: { destroy: jest.fn() },
  Question: { destroy: jest.fn() },
  Response: { destroy: jest.fn() },
  Answer: { destroy: jest.fn() },
  QRCode: { destroy: jest.fn() },
  PaymentTransaction: { destroy: jest.fn() },
  NotificationHistory: { destroy: jest.fn() },
  AuditLog: { destroy: jest.fn() },
}));

describe('Subscription Service', () => {
  let testUser;
  let mockUsageRecords;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockUsageRecords = [];

    // Reset subscription service mock state
    if (global.resetMockSubscriptionState) {
      global.resetMockSubscriptionState();
    }

    // Mock user
    testUser = {
      id: 1,
      email: 'subscription-test@example.com',
      subscription_plan: 'free',
      subscription_status: 'active',
      email_verified: true,
      update: jest.fn().mockImplementation(function(data) {
        Object.assign(this, data);
        return Promise.resolve([1]);
      }),
    };

    User.findByPk.mockResolvedValue(testUser);
    User.create.mockResolvedValue(testUser);
    User.destroy.mockResolvedValue(true);

    // Mock subscription usage
    SubscriptionUsage.findAll.mockImplementation(() => Promise.resolve([...mockUsageRecords]));
    SubscriptionUsage.findOne.mockResolvedValue(null);
    SubscriptionUsage.findOrCreate.mockImplementation((options) => {
      const existing = mockUsageRecords.find(r =>
        r.user_id === options.where.user_id && r.usage_type === options.where.usage_type,
      );
      if (existing) {
        return Promise.resolve([existing, false]);
      } else {
        const newRecord = {
          user_id: options.where.user_id,
          usage_type: options.where.usage_type,
          current_count: 0,
          save: jest.fn().mockResolvedValue(true),
        };
        mockUsageRecords.push(newRecord);
        return Promise.resolve([newRecord, true]);
      }
    });
    SubscriptionUsage.create.mockResolvedValue({ current_count: 0 });
  });

  describe('getCurrentSubscription', () => {
    test('should return current subscription for valid user', async () => {
      const result = await subscriptionService.getCurrentSubscription(testUser.id);

      expect(result.success).toBe(true);
      expect(result.data.user_id).toBe(testUser.id);
      expect(result.data.subscription_plan).toBe('free');
      expect(result.data.subscription_status).toBe('active');
      expect(result.data.limits.questionnaires.limit).toBe(1);
      expect(result.data.limits.responses.limit).toBe(50);
      expect(result.data.limits.exports.limit).toBe(5);
    });

    test('should throw error for non-existent user', async () => {
      User.findByPk.mockResolvedValueOnce(null);

      await expect(subscriptionService.getCurrentSubscription(99999))
        .rejects.toThrow('User not found');
    });
  });

  describe('checkLimit', () => {
    test('should allow action within free plan limits', async () => {
      const result = await subscriptionService.checkLimit(testUser.id, 'questionnaires', 1);

      expect(result.allowed).toBe(true);
    });

    test('should deny action exceeding free plan limits', async () => {
      const result = await subscriptionService.checkLimit(testUser.id, 'questionnaires', 2);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('limit exceeded');
      expect(result.error_code).toBe('SUBSCRIPTION_ERROR_001');
    });

    test('should allow unlimited actions for business plan', async () => {
      // Update user to business plan
      await testUser.update({ subscription_plan: 'business' });

      const result = await subscriptionService.checkLimit(testUser.id, 'questionnaires', 100);

      expect(result.allowed).toBe(true);
    });

    test('should deny action for inactive subscription', async () => {
      await testUser.update({ subscription_status: 'inactive' });

      const result = await subscriptionService.checkLimit(testUser.id, 'questionnaires', 1);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Subscription is not active');
      expect(result.error_code).toBe('SUBSCRIPTION_ERROR_005');
    });
  });

  describe('incrementUsage', () => {
    test('should increment usage count', async () => {
      await subscriptionService.incrementUsage(testUser.id, 'questionnaires', 1);

      const usage = await subscriptionService.getCurrentUsage(testUser.id);
      expect(usage.questionnaires.used).toBe(1);
    });

    test('should handle multiple increments', async () => {
      await subscriptionService.incrementUsage(testUser.id, 'responses', 10);
      await subscriptionService.incrementUsage(testUser.id, 'responses', 5);

      const usage = await subscriptionService.getCurrentUsage(testUser.id);
      expect(usage.responses.used).toBe(15);
    });
  });

  describe('getCurrentUsage', () => {
    test('should return zero usage for new user', async () => {
      const usage = await subscriptionService.getCurrentUsage(testUser.id);

      expect(usage.questionnaires.used).toBe(0);
      expect(usage.responses.used).toBe(0);
      expect(usage.exports.used).toBe(0);
    });

    test('should return correct usage after increments', async () => {
      await subscriptionService.incrementUsage(testUser.id, 'questionnaires', 1);
      await subscriptionService.incrementUsage(testUser.id, 'responses', 25);

      const usage = await subscriptionService.getCurrentUsage(testUser.id);

      expect(usage.questionnaires.used).toBe(1);
      expect(usage.responses.used).toBe(25);
    });
  });

  describe('generateUpgradePrompt', () => {
    test('should generate upgrade suggestions for free plan user', async () => {
      const result = await subscriptionService.generateUpgradePrompt(testUser.id);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.upgrade_suggestions)).toBe(true);
    });

    test('should not generate suggestions for business plan', async () => {
      await testUser.update({ subscription_plan: 'business' });

      const result = await subscriptionService.generateUpgradePrompt(testUser.id);

      expect(result.success).toBe(true);
      expect(result.data.upgrade_suggestions).toEqual([]);
    });
  });
});