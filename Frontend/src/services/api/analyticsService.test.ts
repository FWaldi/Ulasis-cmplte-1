import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyticsService } from './analyticsService';

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

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
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3010/api/v1');
    // Set auth token
    localStorageMock.setItem('accessToken', 'test-token');
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('getBubbleAnalytics', () => {
    it('should fetch bubble analytics successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Analytics retrieved',
        data: {
          categories: [
            {
              name: 'Service Quality',
              rating: 4.2,
              response_count: 150,
              response_rate: 85,
              color: 'green',
              trend: 'up',
            },
            {
              name: 'Cleanliness',
              rating: 3.8,
              response_count: 140,
              response_rate: 80,
              color: 'yellow',
              trend: 'stable',
            },
          ],
          total_responses: 200,
          response_rate: 82,
          period_comparison: {
            current_period: {
              start_date: '2024-01-01',
              end_date: '2024-01-07',
              total_responses: 200,
            },
            previous_period: {
              start_date: '2023-12-25',
              end_date: '2023-12-31',
              total_responses: 180,
            },
            change_percentage: 11.1,
          },
          generated_at: '2024-01-08T10:00:00Z',
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await analyticsService.getBubbleAnalytics(1);

expect(fetchMock).toHaveBeenCalledWith(
          'http://localhost:3010/api/v1/analytics/bubble/1',
           {
           method: 'GET',
           headers: {
             'Content-Type': 'application/json',
             Authorization: 'Bearer test-token',
           },
         }
       );

      expect(result).toEqual(mockResponse);
    });

    it('should handle fetch failure', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(analyticsService.getBubbleAnalytics(1)).rejects.toThrow('Network error');
    });
  });

  describe('getTimeComparison', () => {
    it('should fetch time comparison successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Time comparison retrieved',
        data: {
          current_period: {
            categories: [],
          },
          previous_period: {
            categories: [],
          },
          trend_analysis: 'improving',
        },
      };

      fetchMock.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await analyticsService.getTimeComparison(1, { period: 'week' });

       expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3010/api/v1/analytics/comparison/1?period=week',
         {
           method: 'GET',
           headers: {
             'Content-Type': 'application/json',
             Authorization: 'Bearer test-token',
           },
         }
       );

      expect(result).toEqual(mockResponse);
    });

    it('should handle fetch failure', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(analyticsService.getTimeComparison(1)).rejects.toThrow('Network error');
    });
  });
});