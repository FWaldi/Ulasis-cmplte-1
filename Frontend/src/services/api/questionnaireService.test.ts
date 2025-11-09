import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { questionnaireService } from './questionnaireService';
import { server, resetMockData } from '../../test/mocks/server';
import { http } from 'msw';

// Mock localStorage
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
  }),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('QuestionnaireService', () => {
  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    resetMockData(); // Reset mock data to initial state
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3001/api/v1');
    // Set auth token
    localStorageMock.setItem('accessToken', 'test-token');
    // Ensure demo mode is disabled for API tests
    localStorageMock.setItem('isDemoMode', 'false');
  });

  afterEach(() => {
    localStorageMock.clear();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('getQuestionnaires', () => {
    it('should fetch questionnaires successfully', async () => {
      const result = await questionnaireService.getQuestionnaires();

      expect(result.success).toBe(true);
      expect(result.data.questionnaires).toBeDefined();
      expect(result.data.questionnaires.length).toBeGreaterThan(0);
      expect(result.data.usage).toBeDefined();
      expect(result.data.usage.used).toBe(2);
      expect(result.data.usage.limit).toBe(10);
      expect(result.data.usage.plan).toBe('free');
    });

    it('should handle fetch failure', async () => {
      // Override MSW handler to simulate network error
      server.use(
        http.get('http://localhost:3001/api/v1/questionnaires', () => {
          return new Response(null, { status: 500 });
        })
      );

      await expect(questionnaireService.getQuestionnaires()).rejects.toThrow('Request failed with status code 500');
    });

    it('should work in demo mode', async () => {
      // Enable demo mode
      localStorageMock.setItem('isDemoMode', 'true');
      localStorageMock.setItem('demoPlan', 'free');

      const result = await questionnaireService.getQuestionnaires();

      expect(result.success).toBe(true);
      expect(result.data.usage.plan).toBe('free');
      expect(result.data.usage.limit).toBe(1);
    });
  });

  describe('createQuestionnaire', () => {
    it('should create questionnaire successfully', async () => {
      const result = await questionnaireService.createQuestionnaire({
        title: 'New Questionnaire',
        description: 'New description',
        category_mapping: {},
        questions: [],
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Questionnaire created successfully');
      expect(result.data.questionnaire).toBeDefined();
      expect(result.data.questionnaire.title).toBe('New Questionnaire');
      expect(result.data.questionnaire.description).toBe('New description');
    });

    it('should handle creation failure', async () => {
      // Override MSW handler to return error
      server.use(
        http.post('http://localhost:3001/api/v1/questionnaires', () => {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Validation error',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );

      await expect(questionnaireService.createQuestionnaire({
        title: 'New Questionnaire',
        category_mapping: {},
        questions: [],
      })).rejects.toThrow('Request failed with status code 400');
    });

    it('should work in demo mode', async () => {
      // Enable demo mode
      localStorageMock.setItem('isDemoMode', 'true');
      localStorageMock.setItem('demoPlan', 'pro'); // Use pro to avoid limit issues

      const result = await questionnaireService.createQuestionnaire({
        title: 'Demo Questionnaire',
        category_mapping: {},
        questions: [],
      });

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Demo Questionnaire');
    });
  });

  describe('updateQuestionnaire', () => {
    it('should update questionnaire successfully', async () => {
      const result = await questionnaireService.updateQuestionnaire(1, {
        title: 'Updated Questionnaire',
        description: 'Updated description',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Questionnaire updated successfully');
      expect(result.data.questionnaire).toBeDefined();
      expect(result.data.questionnaire.title).toBe('Updated Questionnaire');
      expect(result.data.questionnaire.description).toBe('Updated description');
    });

    it('should handle update failure', async () => {
      // Override MSW handler to return error
      server.use(
        http.put('http://localhost:3001/api/v1/questionnaires/1', () => {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Questionnaire not found',
            }),
            {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );

      await expect(questionnaireService.updateQuestionnaire(1, {
        title: 'Updated Questionnaire',
      })).rejects.toThrow('Request failed with status code 404');
    });
  });

  describe('deleteQuestionnaire', () => {
    it('should delete questionnaire successfully', async () => {
      const result = await questionnaireService.deleteQuestionnaire(1);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Questionnaire deleted successfully');
    });

    it('should handle delete failure', async () => {
      // Override MSW handler to return error
      server.use(
        http.delete('http://localhost:3001/api/v1/questionnaires/1', () => {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Questionnaire not found',
            }),
            {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );

      await expect(questionnaireService.deleteQuestionnaire(1)).rejects.toThrow('Request failed with status code 404');
    });
  });

  describe('getQuestionnaire', () => {
    it('should fetch single questionnaire successfully', async () => {
      const result = await questionnaireService.getQuestionnaire(1);

      expect(result.success).toBe(true);
      expect(result.data.questionnaire).toBeDefined();
      expect(result.data.questionnaire.id).toBe('1');
      expect(result.data.questionnaire.title).toBeDefined();
      expect(result.data.questionnaire.description).toBeDefined();
    });

    it('should handle not found error', async () => {
      // Override MSW handler to return 404
      server.use(
        http.get('http://localhost:3001/api/v1/questionnaires/999', () => {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Questionnaire not found',
            }),
            {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );

      await expect(questionnaireService.getQuestionnaire(999)).rejects.toThrow('Request failed with status code 404');
    });

    it('should work in demo mode', async () => {
      // Enable demo mode
      localStorageMock.setItem('isDemoMode', 'true');

      const result = await questionnaireService.getQuestionnaire(1);

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Sample Customer Satisfaction Survey');
      expect(result.data.questions).toBeDefined();
      expect(result.data.questions.length).toBeGreaterThan(0);
    });
  });

  describe('canCreateQuestionnaire', () => {
    it('should return true when under limit', async () => {
      const result = await questionnaireService.canCreateQuestionnaire();

      expect(result.canCreate).toBe(true);
      expect(result.usage.used).toBeGreaterThanOrEqual(2); // Account for tests that add questionnaires
      expect(result.usage.limit).toBe(10);
      expect(result.usage.plan).toBe('free');
    });

    it('should return false when at limit', async () => {
      // Override MSW handler to simulate at limit
      server.use(
        http.get('http://localhost:3001/api/v1/questionnaires', () => {
          return new Response(
            JSON.stringify({
              success: true,
              data: { 
                questionnaires: [],
                usage: { used: 10, limit: 10, plan: 'free' }
              }
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );

      const result = await questionnaireService.canCreateQuestionnaire();

      expect(result.canCreate).toBe(false);
      expect(result.usage.used).toBe(10);
      expect(result.usage.limit).toBe(10);
      expect(result.usage.plan).toBe('free');
    });

    it('should handle fetch failure gracefully', async () => {
      // Override MSW handler to simulate network error
      server.use(
        http.get('http://localhost:3001/api/v1/questionnaires', () => {
          return new Response(null, { status: 500 });
        })
      );

      const result = await questionnaireService.canCreateQuestionnaire();

      // Should return default values when fetch fails
      expect(result.canCreate).toBe(true);
      expect(result.usage.used).toBe(0);
      expect(result.usage.limit).toBe(10);
      expect(result.usage.plan).toBe('free');
    });
  });
});