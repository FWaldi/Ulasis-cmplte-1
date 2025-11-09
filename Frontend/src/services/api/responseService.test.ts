import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { responseService } from './responseService';
import { server } from '../../test/mocks/server';
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

describe('ResponseService', () => {
  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3001/api/v1');
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

  describe('submitAnonymousResponse', () => {
    it('should submit anonymous response successfully', async () => {
      const result = await responseService.submitAnonymousResponse({
        questionnaireId: 1,
        responses: [
          { questionId: 'q1', answer: 'Good service' },
          { questionId: 'q2', answer: 5 },
        ],
        deviceFingerprint: 'test-fingerprint',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Anonymous response submitted successfully');
      expect(result.data.response).toBeDefined();
      expect(result.data.response.questionnaireId).toBe('1');
    });

    it('should handle submission failure', async () => {
      // Override MSW handler to return error
      server.use(
        http.post('http://localhost:3001/api/v1/responses/anonymous', () => {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Rate limit exceeded',
            }),
            {
              status: 429,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );

      await expect(responseService.submitAnonymousResponse({
        questionnaireId: 1,
        responses: [],
      })).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle network error', async () => {
      // Override MSW handler to simulate network error
      server.use(
        http.post('http://localhost:3001/api/v1/responses/anonymous', () => {
          // Simulate network error by not responding
          return new Response(null, { status: 500 });
        })
      );

      await expect(responseService.submitAnonymousResponse({
        questionnaireId: 1,
        responses: [],
      })).rejects.toThrow();
    });

    it('should work in demo mode', async () => {
      // Enable demo mode
      localStorageMock.setItem('isDemoMode', 'true');

      const result = await responseService.submitAnonymousResponse({
        questionnaireId: 1,
        responses: [
          { questionId: 'q1', answer: 'Demo response' },
        ],
        deviceFingerprint: 'demo-fingerprint',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Demo response submitted successfully');
      expect(result.data.responseId).toBeDefined();
      expect(result.data.submittedAt).toBeDefined();
    });
  });

  describe('submitManualResponse', () => {
    it('should submit manual response successfully', async () => {
      const result = await responseService.submitManualResponse({
        questionnaireId: 1,
        responses: [
          { questionId: 'q1', answer: 'Manual response' },
        ],
        respondentInfo: {
          name: 'Test User',
          email: 'test@example.com',
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Manual response submitted successfully');
      expect(result.data.responseId).toBeDefined();
      expect(result.data.submittedAt).toBeDefined();
    });
  });

  describe('getResponses', () => {
    it('should fetch responses successfully', async () => {
      const result = await responseService.getResponses(1);

      expect(result.success).toBe(true);
      expect(result.data.responses).toBeDefined();
      expect(result.data.total).toBeDefined();
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
    });
  });
});