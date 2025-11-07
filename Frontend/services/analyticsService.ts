import { apiService, ApiResponse } from './apiService';

export interface BubbleAnalytics {
  id: string;
  category: string;
  performance: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  rating: number;
  responseCount: number;
  responseRate: number;
  trend: 'improving' | 'stable' | 'declining';
  trendPercentage: number;
  color: string;
  size: number;
  position: { x: number; y: number };
}

export interface KPI {
  id: string;
  name: string;
  value: number | string;
  unit?: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  target?: number;
  targetAchievement?: number;
  category: string;
}

export interface TimeComparisonData {
  period1: {
    start: string;
    end: string;
    metrics: {
      totalResponses: number;
      averageRating: number;
      responseRate: number;
      bubbleAnalytics: BubbleAnalytics[];
    };
  };
  period2: {
    start: string;
    end: string;
    metrics: {
      totalResponses: number;
      averageRating: number;
      responseRate: number;
      bubbleAnalytics: BubbleAnalytics[];
    };
  };
  changes: {
    responseChange: number;
    ratingChange: number;
    responseRateChange: number;
    bubbleChanges: {
      categoryId: string;
      performanceChange: string;
      ratingChange: number;
    }[];
  };
}

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  questionnaireIds?: string[];
  categories?: string[];
  comparisonPeriod?: 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

export interface DetailedBubbleAnalytics extends BubbleAnalytics {
  historicalData: {
    date: string;
    rating: number;
    responseCount: number;
  }[];
  questionBreakdown: {
    questionId: string;
    questionText: string;
    averageRating: number;
    responseCount: number;
  }[];
  improvementSuggestions: string[];
  riskFactors: string[];
}

export interface PerformanceThresholds {
  excellent: { min: number; color: string };
  good: { min: number; color: string };
  needs_improvement: { min: number; color: string };
  critical: { max: number; color: string };
}

class AnalyticsService {
  async getDashboardKPIs(
    filters: AnalyticsFilters = {}
  ): Promise<ApiResponse<KPI[]>> {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      )
    );

    return apiService.authenticatedRequest<KPI[]>(
      `/analytics/kpis?${params.toString()}`
    );
  }

  async getBubbleAnalytics(
    filters: AnalyticsFilters = {}
  ): Promise<ApiResponse<BubbleAnalytics[]>> {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      )
    );

    return apiService.authenticatedRequest<BubbleAnalytics[]>(
      `/analytics/bubbles?${params.toString()}`
    );
  }

  async getDetailedBubbleAnalytics(
    categoryId: string,
    filters: AnalyticsFilters = {}
  ): Promise<ApiResponse<DetailedBubbleAnalytics>> {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      )
    );

    return apiService.authenticatedRequest<DetailedBubbleAnalytics>(
      `/analytics/bubbles/${categoryId}?${params.toString()}`
    );
  }

  async getTimeComparison(
    filters: AnalyticsFilters = {}
  ): Promise<ApiResponse<TimeComparisonData>> {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      )
    );

    return apiService.authenticatedRequest<TimeComparisonData>(
      `/analytics/comparison?${params.toString()}`
    );
  }

  async getPerformanceThresholds(): Promise<ApiResponse<PerformanceThresholds>> {
    return apiService.authenticatedRequest<PerformanceThresholds>(
      '/analytics/thresholds'
    );
  }

  async updatePerformanceThresholds(
    thresholds: Partial<PerformanceThresholds>
  ): Promise<ApiResponse<PerformanceThresholds>> {
    return apiService.authenticatedRequest<PerformanceThresholds>(
      '/analytics/thresholds',
      {
        method: 'PUT',
        body: JSON.stringify(thresholds),
      }
    );
  }

  async getAnalyticsSummary(
    filters: AnalyticsFilters = {}
  ): Promise<ApiResponse<{
    totalResponses: number;
    averageRating: number;
    responseRate: number;
    activeQuestionnaires: number;
    bubblePerformance: {
      excellent: number;
      good: number;
      needs_improvement: number;
      critical: number;
    };
    topPerformingCategories: string[];
    improvementAreas: string[];
    recentTrends: {
      responses: 'increasing' | 'decreasing' | 'stable';
      ratings: 'improving' | 'declining' | 'stable';
    };
  }>> {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      )
    );

    return apiService.authenticatedRequest(
      `/analytics/summary?${params.toString()}`
    );
  }

  async getHistoricalData(
    metric: 'responses' | 'ratings' | 'response_rate',
    period: 'day' | 'week' | 'month',
    filters: AnalyticsFilters = {}
  ): Promise<ApiResponse<{ date: string; value: number }[]>> {
    const params = new URLSearchParams({
      metric,
      period,
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      ),
    });

    return apiService.authenticatedRequest(
      `/analytics/historical?${params.toString()}`
    );
  }

  async getCategoryAnalytics(
    categoryId: string,
    filters: AnalyticsFilters = {}
  ): Promise<ApiResponse<{
    category: string;
    performance: BubbleAnalytics;
    questions: {
      id: string;
      text: string;
      averageRating: number;
      responseCount: number;
      trend: 'improving' | 'stable' | 'declining';
    }[];
    suggestions: string[];
    historicalTrend: { date: string; rating: number; responses: number }[];
  }>> {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      )
    );

    return apiService.authenticatedRequest(
      `/analytics/categories/${categoryId}?${params.toString()}`
    );
  }

  async exportAnalytics(
    format: 'csv' | 'excel' | 'pdf',
    filters: AnalyticsFilters = {}
  ): Promise<ApiResponse<{ downloadUrl: string }>> {
    const params = new URLSearchParams({
      format,
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      ),
    });

    return apiService.authenticatedRequest<{ downloadUrl: string }>(
      `/analytics/export?${params.toString()}`,
      { method: 'POST' }
    );
  }

  async getRealTimeUpdates(): Promise<ApiResponse<{
    timestamp: string;
    newResponses: number;
    ratingChanges: {
      categoryId: string;
      oldRating: number;
      newRating: number;
    }[];
    bubbleUpdates: BubbleAnalytics[];
  }>> {
    return apiService.authenticatedRequest('/analytics/realtime');
  }

  // Bubble-specific analytics
  async calculateBubblePerformance(
    categoryId: string,
    data: {
      ratings: number[];
      responseCount: number;
      totalPossibleResponses: number;
    }
  ): Promise<ApiResponse<BubbleAnalytics>> {
    return apiService.authenticatedRequest<BubbleAnalytics>(
      `/analytics/bubbles/${categoryId}/calculate`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async getBubbleInsights(
    categoryId: string
  ): Promise<ApiResponse<{
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high';
    actionItems: string[];
  }>> {
    return apiService.authenticatedRequest(
      `/analytics/bubbles/${categoryId}/insights`
    );
  }

  async compareBubbles(
    categoryIds: string[],
    filters: AnalyticsFilters = {}
  ): Promise<ApiResponse<{
    comparison: {
      categoryId: string;
      performance: BubbleAnalytics;
      rank: number;
    }[];
    insights: string[];
    recommendations: string[];
  }>> {
    const params = new URLSearchParams({
      categories: categoryIds.join(','),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      ),
    });

    return apiService.authenticatedRequest(
      `/analytics/bubbles/compare?${params.toString()}`
    );
  }

  // Helper methods for frontend calculations
  calculateBubbleColor(
    rating: number,
    thresholds: PerformanceThresholds
  ): string {
    if (rating >= thresholds.excellent.min) return thresholds.excellent.color;
    if (rating >= thresholds.good.min) return thresholds.good.color;
    if (rating >= thresholds.needs_improvement.min)
      return thresholds.needs_improvement.color;
    return thresholds.critical.color;
  }

  calculateBubbleSize(responseCount: number, maxResponses: number): number {
    // Scale bubble size between 50px and 200px based on response count
    const minSize = 50;
    const maxSize = 200;
    const ratio = responseCount / maxResponses;
    return minSize + (maxSize - minSize) * ratio;
  }

  calculateTrend(current: number, previous: number): {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  } {
    if (previous === 0) {
      return { direction: 'stable', percentage: 0 };
    }

    const change = ((current - previous) / previous) * 100;
    const direction = change > 1 ? 'up' : change < -1 ? 'down' : 'stable';
    
    return {
      direction,
      percentage: Math.abs(change),
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;