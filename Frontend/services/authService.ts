import { apiService, ApiResponse } from './apiService';

export interface User {
  id: string;
  email: string;
  name: string;
  businessName?: string;
  subscriptionPlan: 'free' | 'starter' | 'business';
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  businessName?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    const response = await apiService.post<AuthResponse>('/auth/login', credentials);
    
    if (response.success && response.data) {
      apiService.setAuthToken(response.data.token);
      // Store user data
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    }
    
    return response;
  }

  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    const response = await apiService.post<AuthResponse>('/auth/register', data);
    
    if (response.success && response.data) {
      apiService.setAuthToken(response.data.token);
      // Store user data
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    }
    
    return response;
  }

  async logout(): Promise<ApiResponse<void>> {
    const response = await apiService.authenticatedRequest<void>('/auth/logout');
    
    // Clear local storage regardless of API response
    apiService.clearAuthToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
    
    return response;
  }

  async refreshToken(): Promise<ApiResponse<AuthResponse>> {
    const response = await apiService.post<AuthResponse>('/auth/refresh');
    
    if (response.success && response.data) {
      apiService.setAuthToken(response.data.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    }
    
    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiService.authenticatedRequest<User>('/auth/me');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return apiService.authenticatedRequest<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<void>> {
    return apiService.authenticatedRequest<void>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return apiService.post<void>('/auth/forgot-password', { email });
  }

  async resetPassword(data: {
    token: string;
    newPassword: string;
  }): Promise<ApiResponse<void>> {
    return apiService.post<void>('/auth/reset-password', data);
  }

  // Helper methods for frontend state management
  isAuthenticated(): boolean {
    return !!apiService.getAuthToken();
  }

  getStoredUser(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }

  getStoredToken(): string | null {
    return apiService.getAuthToken();
  }

  // Subscription management
  async getSubscriptionStatus(): Promise<ApiResponse<{
    plan: string;
    limits: {
      questionnaires: number;
      responses: number;
    };
    usage: {
      questionnaires: number;
      responses: number;
    };
  }>> {
    return apiService.authenticatedRequest('/auth/subscription');
  }

  async upgradePlan(plan: 'starter' | 'business'): Promise<ApiResponse<User>> {
    return apiService.authenticatedRequest<User>('/auth/upgrade', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  }
}

export const authService = new AuthService();
export default authService;