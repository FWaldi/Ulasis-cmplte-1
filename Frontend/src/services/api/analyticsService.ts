// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';

export interface BubbleAnalytics {
  categories: Array<{
    name: string;
    rating: number;
    response_count: number;
    response_rate: number;
    color: 'red' | 'yellow' | 'green';
    trend: 'up' | 'down' | 'stable';
  }>;
  total_responses: number;
  response_rate: number;
  period_comparison: {
    current_period: {
      start_date: string;
      end_date: string;
      total_responses: number;
    };
    previous_period: {
      start_date: string;
      end_date: string;
      total_responses: number;
    };
    change_percentage: number;
  };
  generated_at: string;
}

export interface AnalyticsResponse {
  success: boolean;
  message: string;
  data: BubbleAnalytics;
}

class AnalyticsService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getBubbleAnalytics(questionnaireId: number): Promise<AnalyticsResponse> {
    try {
      console.log('Fetching analytics for questionnaire:', questionnaireId);
      console.log('Auth headers:', this.getAuthHeaders());
      const response = await fetch(`${API_BASE_URL}/api/v1/analytics/bubble/${questionnaireId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      console.log('Analytics response status:', response.status);
      const data = await response.json();
      console.log('Analytics response data:', data);

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Get bubble analytics error:', error);
      throw error;
    }
  }

  async getTimeComparison(questionnaireId: number, params?: {
    period?: 'week' | 'month' | 'quarter';
    compare_with?: 'previous_period' | 'same_period_last_year';
  }): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.period) queryParams.append('period', params.period);
      if (params?.compare_with) queryParams.append('compare_with', params.compare_with);

      const url = `${API_BASE_URL}/api/v1/analytics/comparison/${questionnaireId}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch time comparison');
      }

      return data;
    } catch (error) {
      console.error('Get time comparison error:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();