import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from './authService';

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

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3010/api/v1');
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const mockResponse = {
        success: true,
        message: 'Login successful',
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 3600,
          tokenType: 'Bearer',
          user: {
            id: 1,
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            subscription_plan: 'free',
            subscription_status: 'active',
            email_verified: true,
          },
        },
      };

      fetchMock.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3010/api/v1/auth/login',
          {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
           body: JSON.stringify({
             email: 'test@example.com',
             password: 'password123',
           }),
         }
       );

      expect(result).toEqual(mockResponse);
      expect(localStorage.getItem('accessToken')).toBe('access-token');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockResponse.data.user));
    });

    it('should handle login failure', async () => {
      const mockResponse = {
        success: false,
        message: 'Invalid credentials',
      };

      fetchMock.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
      expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('should handle network error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error. Please try again.');
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Registration successful',
        data: {},
      };

      fetchMock.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authService.register({
        email: 'new@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
      });

expect(fetchMock).toHaveBeenCalledWith(
         'http://localhost:3010/api/v1/auth/register',
          {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
           body: JSON.stringify({
             email: 'new@example.com',
             password: 'password123',
             first_name: 'New',
             last_name: 'User',
           }),
         }
       );

      expect(result).toEqual(mockResponse);
    });

    it('should handle registration failure', async () => {
      const mockResponse = {
        success: false,
        message: 'Email already exists',
      };

      fetchMock.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authService.register({
        email: 'existing@example.com',
        password: 'password123',
        first_name: 'Existing',
        last_name: 'User',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Email already exists');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      localStorage.setItem('refreshToken', 'old-refresh-token');

      const mockResponse = {
        success: true,
        message: 'Token refreshed',
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 3600,
          tokenType: 'Bearer',
        },
      };

      fetchMock.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authService.refreshToken();

expect(fetchMock).toHaveBeenCalledWith(
         'http://localhost:3010/api/v1/auth/refresh',
          {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
           body: JSON.stringify({ refresh_token: 'old-refresh-token' }),
         }
       );

      expect(result).toEqual(mockResponse);
      expect(localStorage.getItem('accessToken')).toBe('new-access-token');
      expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
    });

    it('should handle refresh failure when no refresh token', async () => {
      const result = await authService.refreshToken();

      expect(result.success).toBe(false);
      expect(result.message).toBe('No refresh token available.');
    });
  });

  describe('logout', () => {
    it('should logout and clear storage', async () => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('refreshToken', 'refresh');
      localStorage.setItem('user', 'user-data');

      const mockResponse = { success: true };

      fetchMock.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authService.logout();

expect(fetchMock).toHaveBeenCalledWith(
         'http://localhost:3010/api/v1/auth/logout',
          {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
           body: JSON.stringify({ refresh_token: 'refresh' }),
         }
       );

      expect(result.success).toBe(true);
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when access token exists', () => {
      localStorage.setItem('accessToken', 'token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when no access token', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should return parsed user data', () => {
      const user = { id: 1, email: 'test@example.com' };
      localStorage.setItem('user', JSON.stringify(user));
      expect(authService.getCurrentUser()).toEqual(user);
    });

    it('should return null when no user data', () => {
      expect(authService.getCurrentUser()).toBeNull();
    });
  });
});