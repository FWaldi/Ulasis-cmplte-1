import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { analyticsService } from './analyticsService';
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

describe('AnalyticsService', () => {
  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3001/api/v1');
    // Set auth token
    localStorageMock.setItem('accessToken', 'test-token');
  });

  afterEach(() => {
    localStorageMock.clear();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('getBubbleAnalytics', () => {
    it('should fetch bubble analytics successfully', async () => {
      const result = await analyticsService.getBubbleAnalytics(1);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Analytics retrieved');
      expect(result.data.categories).toBeDefined();
      expect(result.data.categories).toHaveLength(2);
      expect(result.data.total_responses).toBe(200);
      expect(result.data.response_rate).toBe(82);
      expect(result.data.generated_at).toBe('2024-01-08T10:00:00Z');
    });

    it('should handle fetch failure with error response', async () => {
      // Override MSW handler to return error
      server.use(
        http.get('http://localhost:3001/api/v1/analytics/bubble/:id', () => {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Analytics service temporarily unavailable',
              error: 'Service disabled for maintenance'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );

      await expect(analyticsService.getBubbleAnalytics(1)).rejects.toThrow('Analytics service temporarily unavailable');
    });

    it('should handle network error', async () => {
      // Override MSW handler to simulate network error
      server.use(
        http.get('http://localhost:3001/api/v1/analytics/bubble/:id', () => {
          // Simulate network error by not responding
          return new Response(null, { status: 500 });
        })
      );

      await expect(analyticsService.getBubbleAnalytics(1)).rejects.toThrow();
    });
  });

  describe('getTimeComparison', () => {
    it('should fetch time comparison successfully', async () => {
      const result = await analyticsService.getTimeComparison(1, { period: 'week' });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Time comparison data retrieved');
      expect(result.data.questionnaireId).toBe('1');
      expect(result.data.period).toBe('week');
      expect(result.data.current_period).toBeDefined();
      expect(result.data.previous_period).toBeDefined();
      expect(result.data.change_percentage).toBe(11.1);
    });

    it('should handle fetch failure with error response', async () => {
      // Override MSW handler to return error
      server.use(
        http.get('http://localhost:3001/api/v1/analytics/comparison/:id', () => {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Analytics service temporarily unavailable',
              error: 'Service disabled for maintenance'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );

      await expect(analyticsService.getTimeComparison(1)).rejects.toThrow('Analytics service temporarily unavailable');
    });

    it('should handle network error', async () => {
      // Override MSW handler to simulate network error
      server.use(
        http.get('http://localhost:3001/api/v1/analytics/comparison/:id', () => {
          // Simulate network error by not responding
          return new Response(null, { status: 500 });
        })
      );

      await expect(analyticsService.getTimeComparison(1)).rejects.toThrow();
    });

    it('should build query parameters correctly', async () => {
      // Override MSW handler to capture the request URL
      let capturedUrl = '';
      server.use(
        http.get('http://localhost:3001/api/v1/analytics/comparison/:id', ({ request }) => {
          capturedUrl = request.url;
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Time comparison data retrieved',
              data: {
                questionnaireId: '1',
                period: 'month',
                compare_with: 'same_period_last_year'
              }
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );

      await analyticsService.getTimeComparison(1, { 
        period: 'month', 
        compare_with: 'same_period_last_year' 
      });

      expect(capturedUrl).toContain('period=month');
      expect(capturedUrl).toContain('compare_with=same_period_last_year');
    });
  });
});