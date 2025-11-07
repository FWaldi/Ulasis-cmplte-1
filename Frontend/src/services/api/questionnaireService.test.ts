import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock axios instance using vi.hoisted
const mockAxiosInstance = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  }
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance)
  }
}));

import { questionnaireService } from './questionnaireService';

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
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Set auth token
    localStorageMock.setItem('accessToken', 'test-token');
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('getQuestionnaires', () => {
    it('should fetch questionnaires successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Questionnaires retrieved',
        data: {
          questionnaires: [
            {
              id: 1,
              user_id: 1,
              title: 'Test Questionnaire',
              category_mapping: {},
              is_active: true,
              created_at: '2023-01-01',
              updated_at: '2023-01-01',
            },
          ],
          usage: {
            used: 1,
            limit: 10,
            plan: 'free',
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await questionnaireService.getQuestionnaires();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/questionnaires');

      expect(result).toEqual(mockResponse);
    });

    it('should handle fetch failure', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(questionnaireService.getQuestionnaires()).rejects.toThrow('Network error');
    });
  });

  describe('createQuestionnaire', () => {
    it('should create questionnaire successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Questionnaire created',
        data: {
          id: 1,
          user_id: 1,
          title: 'New Questionnaire',
          category_mapping: {},
          is_active: true,
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await questionnaireService.createQuestionnaire({
        title: 'New Questionnaire',
        category_mapping: {},
        questions: [],
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/questionnaires', {
        title: 'New Questionnaire',
        category_mapping: {},
        questions: [],
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle creation failure', async () => {
      const mockResponse = {
        success: false,
        message: 'Validation error',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      await expect(questionnaireService.createQuestionnaire({
        title: 'New Questionnaire',
        category_mapping: {},
        questions: [],
      })).rejects.toThrow('Validation error');
    });
  });

  describe('updateQuestionnaire', () => {
    it('should update questionnaire successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Questionnaire updated',
        data: {
          id: 1,
          user_id: 1,
          title: 'Updated Questionnaire',
          category_mapping: {},
          is_active: true,
          updated_at: '2023-01-02',
        },
      };

      mockAxiosInstance.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await questionnaireService.updateQuestionnaire(1, {
        title: 'Updated Questionnaire',
      });

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/v1/questionnaires/1', {
        title: 'Updated Questionnaire',
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteQuestionnaire', () => {
    it('should delete questionnaire successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Questionnaire deleted',
      };

      mockAxiosInstance.delete.mockResolvedValueOnce({ data: mockResponse });

      const result = await questionnaireService.deleteQuestionnaire(1);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/questionnaires/1');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('canCreateQuestionnaire', () => {
    it('should return true when under limit', async () => {
      const mockResponse = {
        success: true,
        data: {
          questionnaires: [],
          usage: { used: 0, limit: 10, plan: 'free' },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await questionnaireService.canCreateQuestionnaire();

      expect(result.canCreate).toBe(true);
      expect(result.usage).toEqual({ used: 0, limit: 10, plan: 'free' });
    });

    it('should return false when at limit', async () => {
      const mockResponse = {
        success: true,
        data: {
          questionnaires: [],
          usage: { used: 10, limit: 10, plan: 'free' },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await questionnaireService.canCreateQuestionnaire();

      expect(result.canCreate).toBe(false);
      expect(result.usage).toEqual({ used: 10, limit: 10, plan: 'free' });
    });
  });
});