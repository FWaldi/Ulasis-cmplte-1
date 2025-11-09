// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    user: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      subscription_plan: string;
      subscription_status: string;
      email_verified: boolean;
    };
  };
}

export interface UserResponse {
  success: boolean;
  data?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    subscription_plan: string;
    subscription_status: string;
    email_verified: boolean;
    last_login_at?: string;
    is_active: boolean;
    preferences: any;
    created_at: string;
    updated_at: string;
  };
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

class AuthService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Store tokens in localStorage
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  }

  async register(userData: RegisterRequest): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  }

  async verifyEmail(token: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify/${token}`, {
        method: 'GET',
      });

      return await response.json();
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  }

  async requestPasswordReset(email: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      return await response.json();
    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      return await response.json();
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  }

  async getProfile(): Promise<UserResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      return await response.json();
    } catch (error) {
      console.error('Get profile error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  }

  async updateProfile(userData: Partial<{
    first_name: string;
    last_name: string;
    preferences: any;
  }>): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      return await response.json();
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return {
          success: false,
          message: 'No refresh token available.',
        };
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Update tokens in localStorage
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
      }

      return data;
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        // Don't wait for response, just clear local storage
      }

      // Clear all auth data from localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      return {
        success: true,
        message: 'Logged out successfully.',
      };
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local storage even if API call fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      return {
        success: true,
        message: 'Logged out successfully.',
      };
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // Auto-refresh token if needed
  async ensureValidToken(): Promise<boolean> {
    try {
      const token = this.getAccessToken();
      if (!token) return false;

      // Check if token is expired (simple check)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      
      if (payload.exp < now) {
        // Token expired, try to refresh
        const refreshResult = await this.refreshToken();
        return refreshResult.success;
      }

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
}

export const authService = new AuthService();