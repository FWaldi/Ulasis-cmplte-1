import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { authService } from './authService';
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

describe('AuthService', () => {
  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3001/api/v1');
  });

  afterEach(() => {
    localStorageMock.clear();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const result = await authService.login({
        email: 'admin@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successful');
      expect(result.data.user).toBeDefined();
      expect(result.data.accessToken).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();
      expect(localStorageMock.getItem('accessToken')).toBe(result.data.accessToken);
      expect(localStorageMock.getItem('refreshToken')).toBe(result.data.refreshToken);
      expect(localStorageMock.getItem('user')).toBe(JSON.stringify(result.data.user));
    });

    it('should handle login failure', async () => {
      // Override MSW handler to return error
      server.use(
        http.post('http://localhost:3001/api/v1/auth/login', () => {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Invalid credentials',
            }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );

      const result = await authService.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
      expect(localStorageMock.getItem('accessToken')).toBeNull();
    });

    it('should handle network error', async () => {
      // Override MSW handler to simulate network error
      server.use(
        http.post('http://localhost:3001/api/v1/auth/login', () => {
          // Simulate network error by not responding
          return new Response(null, { status: 500 });
        })
      );

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
      const result = await authService.register({
        email: 'new@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('User registered successfully');
      expect(result.data.user).toBeDefined();
      expect(result.data.accessToken).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();
    });

    it('should handle registration failure', async () => {
      // Override MSW handler to return error
      server.use(
        http.post('http://localhost:3001/api/v1/auth/register', () => {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Email already exists',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );

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
      localStorageMock.setItem('refreshToken', 'old-refresh-token');

      const result = await authService.refreshToken();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Token refreshed successfully');
      expect(result.data.accessToken).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();
      expect(localStorageMock.getItem('accessToken')).toBe(result.data.accessToken);
      expect(localStorageMock.getItem('refreshToken')).toBe(result.data.refreshToken);
    });

    it('should handle refresh failure when no refresh token', async () => {
      const result = await authService.refreshToken();

      expect(result.success).toBe(false);
      expect(result.message).toBe('No refresh token available.');
    });

    it('should handle refresh failure with network error', async () => {
      localStorageMock.setItem('refreshToken', 'old-refresh-token');
      
      // Override MSW handler to simulate network error
      server.use(
        http.post('http://localhost:3001/api/v1/auth/refresh', () => {
          return new Response(null, { status: 500 });
        })
      );

      const result = await authService.refreshToken();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error. Please try again.');
    });
  });

  describe('logout', () => {
    it('should logout and clear storage', async () => {
      localStorageMock.setItem('accessToken', 'token');
      localStorageMock.setItem('refreshToken', 'refresh');
      localStorageMock.setItem('user', 'user-data');

      const result = await authService.logout();

      expect(result.success).toBe(true);
      expect(localStorageMock.getItem('accessToken')).toBeNull();
      expect(localStorageMock.getItem('refreshToken')).toBeNull();
      expect(localStorageMock.getItem('user')).toBeNull();
    });

    it('should clear storage even if API call fails', async () => {
      localStorageMock.setItem('accessToken', 'token');
      localStorageMock.setItem('refreshToken', 'refresh');
      localStorageMock.setItem('user', 'user-data');

      // Override MSW handler to simulate network error
      server.use(
        http.post('http://localhost:3001/api/v1/auth/logout', () => {
          return new Response(null, { status: 500 });
        })
      );

      const result = await authService.logout();

      expect(result.success).toBe(true);
      expect(localStorageMock.getItem('accessToken')).toBeNull();
      expect(localStorageMock.getItem('refreshToken')).toBeNull();
      expect(localStorageMock.getItem('user')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when access token exists', () => {
      localStorageMock.setItem('accessToken', 'token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when no access token', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should return parsed user data', () => {
      const user = { id: 1, email: 'test@example.com' };
      localStorageMock.setItem('user', JSON.stringify(user));
      expect(authService.getCurrentUser()).toEqual(user);
    });

    it('should return null when no user data', () => {
      expect(authService.getCurrentUser()).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('should fetch user profile successfully', async () => {
      localStorageMock.setItem('accessToken', 'test-token');

      const result = await authService.getProfile();

      expect(result.success).toBe(true);
      expect(result.data.user.id).toBeDefined();
      expect(result.data.user.email).toBeDefined();
      expect(result.data.user.name).toBeDefined();
      expect(result.data.user.role).toBeDefined();
    });

    it('should handle profile fetch failure', async () => {
      localStorageMock.setItem('accessToken', 'test-token');
      
      // Override MSW handler to return error
      server.use(
        http.get('http://localhost:3001/api/v1/auth/profile', () => {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'User not found',
            }),
            {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );

      const result = await authService.getProfile();

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
    });
  });
});