import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { responseService } from './responseService';

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('ResponseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3010/api/v1');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('submitAnonymousResponse', () => {
    it('should submit anonymous response successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Response submitted successfully',
        data: {
          responseId: 123,
          submittedAt: '2024-01-08T10:00:00Z',
        },
      };

      fetchMock.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await responseService.submitAnonymousResponse({
        questionnaireId: 1,
        responses: [
          { questionId: 'q1', answer: 'Good service' },
          { questionId: 'q2', answer: 5 },
        ],
        deviceFingerprint: 'test-fingerprint',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3010/api/v1/responses/anonymous',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionnaire_id: 1,
            qr_code_id: undefined,
            answers: [
              { questionId: 'q1', answer: 'Good service' },
              { questionId: 'q2', answer: 5 },
            ],
            device_fingerprint: 'test-fingerprint',
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle submission failure', async () => {
      const mockResponse = {
        success: false,
        message: 'Rate limit exceeded',
      };

      fetchMock.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      await expect(responseService.submitAnonymousResponse({
        questionnaireId: 1,
        responses: [],
      })).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle network error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(responseService.submitAnonymousResponse({
        questionnaireId: 1,
        responses: [],
      })).rejects.toThrow('Network error');
    });
  });
});