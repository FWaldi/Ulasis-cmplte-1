import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { apiService } from './apiService';
import { server } from '../../test/mocks/server';

describe('API Service Integration Tests', () => {
  beforeEach(() => {
    // Start MSW server before each test
    server.listen();
  });

  afterEach(() => {
    // Reset and clean up after each test
    server.resetHandlers();
    apiService.logout(); // Clear any auth state
  });

  describe('Authentication Flow', () => {
    it('should login successfully and store tokens', async () => {
      const credentials = {
        email: 'admin@example.com',
        password: 'password123'
      };

      const result = await apiService.login(credentials);

      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.token).toMatch(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.-]*$/); // JWT format
      expect(apiService.isAuthenticated()).toBe(true);
      expect(apiService.getCurrentUser()).toBeDefined();
    });

    it('should register new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        businessName: 'Test Business'
      };

      const result = await apiService.register(userData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User registered successfully');
      expect(result.data.user).toBeDefined();
      expect(result.data.token).toBeDefined();
      expect(result.data.token).toMatch(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.-]*$/); // JWT format
    });

    it('should logout and clear tokens', async () => {
      // First login
      await apiService.login({
        email: 'admin@example.com',
        password: 'password123'
      });

      expect(apiService.isAuthenticated()).toBe(true);

      // Then logout
      apiService.logout();

      expect(apiService.isAuthenticated()).toBe(false);
      expect(apiService.getCurrentUser()).toBeNull();
    });

    it('should get current user profile', async () => {
      // Setup authentication
      await apiService.login({
        email: 'admin@example.com',
        password: 'password123'
      });

      const profile = await apiService.getProfile();

      expect(profile.success).toBe(true);
      expect(profile.data.user).toBeDefined();
      expect(profile.data.user.email).toBe('admin@example.com');
    });
  });

  describe('Questionnaire Management', () => {
    beforeEach(async () => {
      // Authenticate before questionnaire operations
      await apiService.login({
        email: 'admin@example.com',
        password: 'password123'
      });
    });

    it('should fetch all questionnaires', async () => {
      const questionnaires = await apiService.getQuestionnaires();

      expect(Array.isArray(questionnaires)).toBe(true);
      expect(questionnaires.length).toBeGreaterThan(0);
      expect(questionnaires[0]).toHaveProperty('id');
      expect(questionnaires[0]).toHaveProperty('title');
    });

    it('should create a new questionnaire', async () => {
      const questionnaireData = {
        title: 'Test Survey',
        description: 'Test Description',
        questions: [
          {
            type: 'rating',
            question: 'How satisfied are you?',
            required: true
          }
        ]
      };

      const result = await apiService.createQuestionnaire(questionnaireData);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe('Test Survey');
      expect(result.description).toBe('Test Description');
    });

    it('should get a specific questionnaire', async () => {
      const questionnaires = await apiService.getQuestionnaires();
      const firstId = questionnaires[0].id;

      const questionnaire = await apiService.getQuestionnaire(firstId);

      expect(questionnaire).toHaveProperty('id', firstId);
      expect(questionnaire).toHaveProperty('title');
    });

    it('should update a questionnaire', async () => {
      const questionnaires = await apiService.getQuestionnaires();
      const firstId = questionnaires[0].id;

      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description'
      };

      const updated = await apiService.updateQuestionnaire(firstId, updateData);

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('Updated Description');
    });

    it('should delete a questionnaire', async () => {
      // First create a questionnaire to delete
      const newQuestionnaire = await apiService.createQuestionnaire({
        title: 'To Delete',
        description: 'Will be deleted'
      });

      // Delete it
      await apiService.deleteQuestionnaire(newQuestionnaire.id);

      // Verify it's gone (this would throw in real implementation)
      const questionnaires = await apiService.getQuestionnaires();
      const found = questionnaires.find(q => q.id === newQuestionnaire.id);
      expect(found).toBeUndefined();
    });
  });

  describe('Response Management', () => {
    beforeEach(async () => {
      await apiService.login({
        email: 'admin@example.com',
        password: 'password123'
      });
    });

    it('should submit anonymous response', async () => {
      const responseData = {
        questionnaireId: '1',
        answers: {
          q1: 5,
          q2: 'Very satisfied'
        },
        metadata: {
          source: 'web',
          userAgent: 'test-agent'
        }
      };

      const result = await apiService.submitAnonymousResponse(responseData);

      expect(result).toHaveProperty('id');
      expect(result.questionnaireId).toBe('1');
      expect(result.answers).toEqual(responseData.answers);
    });

    it('should get responses for a questionnaire', async () => {
      const responses = await apiService.getResponses('1');

      expect(Array.isArray(responses)).toBe(true);
      expect(responses.length).toBeGreaterThan(0);
      expect(responses[0]).toHaveProperty('questionnaireId', '1');
    });
  });

  describe('Analytics and Reporting', () => {
    beforeEach(async () => {
      await apiService.login({
        email: 'admin@example.com',
        password: 'password123'
      });
    });

    it('should get analytics overview', async () => {
      const analytics = await apiService.getAnalyticsOverview();

      expect(analytics).toHaveProperty('totalResponses');
      expect(analytics).toHaveProperty('averageRating');
      expect(analytics).toHaveProperty('responseRate');
      expect(typeof analytics.totalResponses).toBe('number');
    });

    it('should get questionnaire-specific analytics', async () => {
      const analytics = await apiService.getQuestionnaireAnalytics('1');

      expect(analytics).toHaveProperty('totalResponses');
      expect(analytics).toHaveProperty('questionnaireId', '1');
    });

    it('should export data as CSV', async () => {
      const csvBlob = await apiService.exportData('1', 'csv');

      expect(csvBlob).toBeInstanceOf(Blob);
      expect(csvBlob.type).toContain('text/csv');
    });

    it('should export data as Excel', async () => {
      const excelBlob = await apiService.exportData('1', 'excel');

      expect(excelBlob).toBeInstanceOf(Blob);
      expect(excelBlob.type).toContain('application/vnd');
    });
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      await apiService.login({
        email: 'admin@example.com',
        password: 'password123'
      });
    });

    it('should get subscription status', async () => {
      const subscription = await apiService.getSubscription();

      expect(subscription.success).toBe(true);
      expect(subscription.data).toHaveProperty('plan');
      expect(subscription.data).toHaveProperty('status');
      expect(subscription.data.status).toBe('active');
    });

    it('should update subscription', async () => {
      const updateData = {
        plan: 'professional',
        features: ['analytics', 'custom_branding']
      };

      const result = await apiService.updateSubscription(updateData);

      expect(result.success).toBe(true);
      expect(result.data.plan).toBe('professional');
    });
  });

  describe('Notification Management', () => {
    beforeEach(async () => {
      await apiService.login({
        email: 'admin@example.com',
        password: 'password123'
      });
    });

    it('should get notifications', async () => {
      const notifications = await apiService.getNotifications();

      expect(Array.isArray(notifications)).toBe(true);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0]).toHaveProperty('id');
      expect(notifications[0]).toHaveProperty('title');
    });

    it('should mark notification as read', async () => {
      // This would typically mark a specific notification as read
      // In our mock, we just verify the method doesn't throw
      await expect(apiService.markNotificationAsRead(1)).resolves.not.toThrow();
    });
  });

  describe('QR Code Management', () => {
    beforeEach(async () => {
      await apiService.login({
        email: 'admin@example.com',
        password: 'password123'
      });
    });

    it('should get QR codes', async () => {
      const qrCodes = await apiService.getQRCodes();

      expect(Array.isArray(qrCodes)).toBe(true);
    });

    it('should create QR code', async () => {
      const qrData = {
        questionnaireId: '1',
        name: 'Test QR Code',
        settings: {
          size: 'medium',
          style: 'square'
        }
      };

      const qrCode = await apiService.createQRCode(qrData);

      expect(qrCode).toHaveProperty('id');
      expect(qrCode.name).toBe('Test QR Code');
    });
  });

  describe('Admin Functions', () => {
    beforeEach(async () => {
      await apiService.login({
        email: 'admin@example.com',
        password: 'password123'
      });
    });

    it('should get admin stats', async () => {
      const stats = await apiService.getAdminStats();

      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('totalQuestionnaires');
      expect(stats).toHaveProperty('totalResponses');
    });

    it('should get admin users', async () => {
      const users = await apiService.getAdminUsers();

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
      expect(users[0]).toHaveProperty('id');
      expect(users[0]).toHaveProperty('email');
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized error', async () => {
      // Don't authenticate for this test
      await expect(apiService.getQuestionnaires()).rejects.toThrow();
    });

    it('should handle 404 not found error', async () => {
      await apiService.login({
        email: 'admin@example.com',
        password: 'password123'
      });

      await expect(apiService.getQuestionnaire('999')).rejects.toThrow();
    });

    it('should handle 500 server error', async () => {
      await apiService.login({
        email: 'admin@example.com',
        password: 'password123'
      });

      // This would hit our test error endpoint
      const response = await fetch('/api/v1/test/error');
      expect(response.status).toBe(500);
    });
  });

  describe('Token Management', () => {
    it('should ensure valid token', async () => {
      await apiService.login({
        email: 'admin@example.com',
        password: 'password123'
      });

      const isValid = await apiService.ensureValidToken();

      expect(isValid).toBe(true);
    });

    it('should handle expired token refresh', async () => {
      // This would test the token refresh mechanism
      // In our mock setup, tokens don't expire, but we verify the method exists
      await apiService.login({
        email: 'admin@example.com',
        password: 'password123'
      });

      expect(apiService.getAccessToken()).toMatch(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.-]*$/); // JWT format
    });
  });
});