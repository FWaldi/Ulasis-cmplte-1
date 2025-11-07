// Enterprise Admin API Service
class EnterpriseAdminApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1/enterprise-admin';
    this.token = this.getStoredToken();
  }

  private getStoredToken(): string | null {
    return localStorage.getItem('enterpriseAdminToken') || sessionStorage.getItem('enterpriseAdminToken');
  }

  private setStoredToken(token: string, rememberMe: boolean = false): void {
    if (rememberMe) {
      localStorage.setItem('enterpriseAdminToken', token);
    } else {
      sessionStorage.setItem('enterpriseAdminToken', token);
    }
    this.token = token;
  }

  private clearStoredToken(): void {
    localStorage.removeItem('enterpriseAdminToken');
    sessionStorage.removeItem('enterpriseAdminToken');
    localStorage.removeItem('enterpriseAdminUser');
    this.token = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized - token expired
      if (response.status === 401) {
        this.clearStoredToken();
        window.location.href = '/enterprise-admin/login';
        throw new Error('Session expired. Please login again.');
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Authentication Methods
  async login(credentials: {
    email: string;
    password: string;
    twoFactorToken?: string;
    rememberMe?: boolean;
  }) {
    const response = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data?.token) {
      this.setStoredToken(response.data.token, credentials.rememberMe);
      localStorage.setItem('enterpriseAdminUser', JSON.stringify(response.data.adminUser));
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearStoredToken();
    }
  }

  async refreshToken(): Promise<any> {
    const response = await this.request<any>('/auth/refresh', { method: 'POST' });
    
    if (response.success && response.data?.token) {
      this.setStoredToken(response.data.token);
    }
    
    return response;
  }

  async getSessionInfo(): Promise<any> {
    return this.request('/auth/session');
  }

  // Two-Factor Authentication
  async setupTwoFactor(): Promise<any> {
    return this.request('/auth/2fa/setup', { method: 'POST' });
  }

  async verifyAndEnableTwoFactor(token: string): Promise<any> {
    return this.request('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async disableTwoFactor(data: { password: string; token: string }): Promise<any> {
    return this.request('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard
  async getDashboard(): Promise<any> {
    return this.request('/dashboard');
  }

  // Admin Users Management
  async getAdminUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    roleId?: number;
    department?: string;
    isActive?: boolean;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/admin-users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async createAdminUser(adminData: {
    userId: number;
    roleId: number;
    department?: string;
    customPermissions?: any;
  }): Promise<any> {
    return this.request('/admin-users', {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
  }

  async updateAdminUser(id: number, updateData: any): Promise<any> {
    return this.request(`/admin-users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteAdminUser(id: number): Promise<any> {
    return this.request(`/admin-users/${id}`, { method: 'DELETE' });
  }

  // Admin Roles
  async getAdminRoles(): Promise<any> {
    return this.request('/roles');
  }

  // Admin Activities
  async getAdminActivities(params: {
    page?: number;
    limit?: number;
    adminUserId?: number;
    action?: string;
    resourceType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/activities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  // User Management
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    subscriptionPlan?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async bulkUserOperations(data: {
    operation: string;
    userIds: number[];
    updateData?: any;
  }): Promise<any> {
    return this.request('/users/bulk-operations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Analytics
  async getEnterpriseAnalytics(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: string;
    metrics?: string[];
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key, String(v)));
      } else if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/analytics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getUserGrowthAnalytics(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/analytics/user-growth${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getSubscriptionRevenueAnalytics(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/analytics/subscription-revenue${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  // Security Monitoring
  async getSecurityThreats(params: {
    startDate?: string;
    endDate?: string;
    severity?: string;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/security/threats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  // Report Generation
  async generateReport(data: {
    type: string;
    parameters?: any;
    format?: string;
    schedule?: any;
  }): Promise<any> {
    return this.request('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getReports(params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/reports${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async downloadReport(reportId: number): Promise<Blob> {
    const url = `${this.baseURL}/reports/${reportId}/download`;
    const response = await fetch(url, {
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download report: ${response.statusText}`);
    }

    return response.blob();
  }

  // Utility Methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getCurrentUser(): any {
    const userStr = localStorage.getItem('enterpriseAdminUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.permissions) return false;
    
    return user.permissions.includes('*') || user.permissions.includes(permission);
  }

  hasRoleLevel(minLevel: number): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.role) return false;
    
    return user.role.level >= minLevel;
  }
}

export const enterpriseAdminApi = new EnterpriseAdminApiService();
export default enterpriseAdminApi;