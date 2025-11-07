import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
    RegisterData,
    AuthResponse,
    TokenResponse,
    Questionnaire,
    CreateQuestionnaireData,
    UpdateQuestionnaireData,
    BubbleAnalytics,
    TimeComparisonData,
    TimeComparisonParams,
    AnonymousResponseData,
    ResponseSubmission,
    QRCode,
} from '../types';

export interface LoginCredentials {
    email: string;
    password: string;
}

class ApiService {
    private baseURL: string;
    public axiosInstance: AxiosInstance;

    constructor() {
        this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor to add auth token
        this.axiosInstance.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor to handle token refresh
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401) {
                    // Token expired, try refresh
                    try {
                        await this.refreshToken();
                        // Retry the original request
                        const token = localStorage.getItem('accessToken');
                        error.config.headers.Authorization = `Bearer ${token}`;
                        return this.axiosInstance.request(error.config);
                    } catch (refreshError) {
                        // Refresh failed, logout
                        this.logout();
                        throw refreshError;
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    // Authentication
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        const response: AxiosResponse<any> = await this.axiosInstance.post('/auth/login', credentials);
        const data = response.data.data || response.data;
        const { accessToken, refreshToken, user } = data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        if (user) localStorage.setItem('user', JSON.stringify(user));
        return {
            user,
            token: accessToken,
            refreshToken,
        };
    }

    async register(userData: RegisterData): Promise<any> {
        // Transform field names to match API expectations
        const apiData = {
            email: userData.email,
            password: userData.password,
            first_name: userData.firstName,
            last_name: userData.lastName,
            business_name: userData.businessName,
        };
        const response: AxiosResponse<any> = await this.axiosInstance.post('/auth/register', apiData);
        const { accessToken, refreshToken, user } = response.data.data || response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        if (user) localStorage.setItem('user', JSON.stringify(user));
        return response.data;
    }

    async verifyEmail(token: string): Promise<any> {
        const response: AxiosResponse<any> = await this.axiosInstance.get(`/auth/verify/${token}`);
        return response.data;
    }

    async requestPasswordReset(email: string): Promise<any> {
        const response: AxiosResponse<any> = await this.axiosInstance.post('/auth/forgot-password', { email });
        return response.data;
    }

    async resetPassword(token: string, password: string): Promise<any> {
        const response: AxiosResponse<any> = await this.axiosInstance.post('/auth/reset-password', { token, password });
        return response.data;
    }

    async getProfile(): Promise<any> {
        const response: AxiosResponse<any> = await this.axiosInstance.get('/auth/profile');
        return response.data;
    }

    async updateProfile(userData: Partial<{ first_name: string; last_name: string; preferences: any }>): Promise<any> {
        const response: AxiosResponse<any> = await this.axiosInstance.put('/auth/profile', userData);
        return response.data;
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<any> {
        const response: AxiosResponse<any> = await this.axiosInstance.post('/auth/change-password', {
            current_password: currentPassword,
            new_password: newPassword,
        });
        return response.data;
    }

    async refreshToken(): Promise<any> {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token available');

        const response: AxiosResponse<any> = await this.axiosInstance.post('/auth/refresh', {
            refresh_token: refreshToken,
        });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data || response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        return response.data;
    }

    logout(): void {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('authToken'); // Clear any old token keys
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
                return refreshResult.success || true; // Assume success if no error
            }

            return true;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    // Questionnaires
    async getQuestionnaires(): Promise<Questionnaire[]> {
        const response: AxiosResponse<{ success: boolean; data: { questionnaires: Questionnaire[] } }> = await this.axiosInstance.get('/questionnaires');
        return response.data.data.questionnaires || [];
    }

    async createQuestionnaire(data: CreateQuestionnaireData): Promise<Questionnaire> {
        const response: AxiosResponse<{ success: boolean; data: { questionnaire: Questionnaire } }> = await this.axiosInstance.post('/questionnaires', data);
        return response.data.data.questionnaire;
    }

    async getQuestionnaire(id: string | number): Promise<Questionnaire> {
        const response: AxiosResponse<{ success: boolean; data: { questionnaire: Questionnaire } }> = await this.axiosInstance.get(`/questionnaires/${id}`);
        return response.data.data.questionnaire;
    }

    async updateQuestionnaire(id: string | number, data: UpdateQuestionnaireData): Promise<Questionnaire> {
        const response: AxiosResponse<{ success: boolean; data: { questionnaire: Questionnaire } }> = await this.axiosInstance.put(`/questionnaires/${id}`, data);
        return response.data.data.questionnaire;
    }

    async deleteQuestionnaire(id: string | number): Promise<void> {
        await this.axiosInstance.delete(`/questionnaires/${id}`);
    }

    // QR Codes
    async getQRCodes(): Promise<QRCode[]> {
        const response: AxiosResponse<{ success: boolean; data: { qrCodes: QRCode[]; pagination: any } }> = await this.axiosInstance.get('/qr-codes');
        return response.data.data.qrCodes || [];
    }

    async createQRCode(data: any): Promise<QRCode> {
        const response: AxiosResponse<QRCode> = await this.axiosInstance.post('/qr-codes', data);
        return response.data;
    }

    async updateQRCode(id: number, data: any): Promise<QRCode> {
        const response: AxiosResponse<QRCode> = await this.axiosInstance.put(`/qr-codes/${id}`, data);
        return response.data;
    }

    async deleteQRCode(id: number): Promise<void> {
        await this.axiosInstance.delete(`/qr-codes/${id}`);
    }

    // Analytics
    async getBubbleAnalytics(questionnaireId: number): Promise<BubbleAnalytics> {
        const response: AxiosResponse<BubbleAnalytics> = await this.axiosInstance.get(`/analytics/bubble/${questionnaireId}`);
        return response.data;
    }

    async getTimeComparison(questionnaireId: number, params?: TimeComparisonParams): Promise<TimeComparisonData> {
        const response: AxiosResponse<TimeComparisonData> = await this.axiosInstance.get(`/analytics/comparison/${questionnaireId}`, {
            params,
        });
        return response.data;
    }

    async exportData(questionnaireId: string | number, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
        const response: AxiosResponse<Blob> = await this.axiosInstance.get(`/analytics/report/${questionnaireId}`, {
            params: { format },
            responseType: 'blob',
        });
        return response.data;
    }

    async getAnalyticsOverview(): Promise<any> {
        const response: AxiosResponse<{ success: boolean; data: any }> = await this.axiosInstance.get('/analytics/overview');
        return response.data.data;
    }

    async getQuestionnaireAnalytics(questionnaireId: string): Promise<any> {
        const response: AxiosResponse<{ success: boolean; data: any }> = await this.axiosInstance.get(`/analytics/questionnaire/${questionnaireId}`);
        return response.data.data;
    }

    // Anonymous Responses
    async submitAnonymousResponse(data: AnonymousResponseData): Promise<ResponseSubmission> {
        const response: AxiosResponse<{ success: boolean; data: { response: ResponseSubmission } }> = await this.axiosInstance.post('/responses/anonymous', data);
        return response.data.data.response;
    }

    async getResponses(questionnaireId: string): Promise<any[]> {
        const response: AxiosResponse<{ success: boolean; data: { responses: any[] } }> = await this.axiosInstance.get(`/responses/questionnaire/${questionnaireId}`);
        return response.data.data.responses || [];
    }

    // Questions (for questionnaire management)
    async getQuestions(questionnaireId?: number): Promise<any[]> {
        const url = questionnaireId ? `/questions?questionnaireId=${questionnaireId}` : '/questions';
        const response: AxiosResponse<any[]> = await this.axiosInstance.get(url);
        return response.data;
    }

    async createQuestion(data: any): Promise<any> {
        const response: AxiosResponse<any> = await this.axiosInstance.post('/questions', data);
        return response.data;
    }

    async updateQuestion(id: number, data: any): Promise<any> {
        const response: AxiosResponse<any> = await this.axiosInstance.put(`/questions/${id}`, data);
        return response.data;
    }

    async deleteQuestion(id: number): Promise<void> {
        await this.axiosInstance.delete(`/questions/${id}`);
    }

    // Subscription management
    async getSubscription(): Promise<any> {
        const response: AxiosResponse<{ success: boolean; data: any }> = await this.axiosInstance.get('/subscription/status');
        return response.data;
    }

    async updateSubscription(data: any): Promise<any> {
        const response: AxiosResponse<{ success: boolean; data: any }> = await this.axiosInstance.put('/subscription', data);
        return response.data;
    }

    // Notifications
    async getNotifications(): Promise<any[]> {
        const response: AxiosResponse<{ success: boolean; data: { notifications: any[] } }> = await this.axiosInstance.get('/notifications');
        return response.data.data.notifications || [];
    }

    async markNotificationAsRead(id: number): Promise<void> {
        await this.axiosInstance.put(`/notifications/${id}/read`);
    }

    // Health check
    async healthCheck(): Promise<any> {
        const response: AxiosResponse<any> = await this.axiosInstance.get('/health');
        return response.data;
    }

    // Admin endpoints (if user is admin)
    async getAdminStats(): Promise<any> {
        const response: AxiosResponse<{ success: boolean; data: any }> = await this.axiosInstance.get('/admin/stats');
        return response.data.data;
    }

    async getAdminUsers(): Promise<any[]> {
        const response: AxiosResponse<{ success: boolean; data: { users: any[] } }> = await this.axiosInstance.get('/admin/users');
        return response.data.data.users || [];
    }

    // Auth token utilities
    getAuthToken(): string | null {
        return localStorage.getItem('accessToken');
    }

    clearAuthToken(): void {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;