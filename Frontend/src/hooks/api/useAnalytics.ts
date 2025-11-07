import { useApi, useMutation, useRealTime, useDownload } from './useApi';
import apiService from '../../services/api/apiService';
import { BubbleAnalytics, TimeComparisonData, TimeComparisonParams, AnalyticsSummaryData, AnalyticsDashboardData } from '../types';

// Bubble analytics hook
export function useBubbleAnalytics(questionnaireId: number | null, enabled: boolean = true) {
    return useApi<BubbleAnalytics>(
        questionnaireId ? `/api/v1/analytics/bubble/${questionnaireId}` : null,
        { enabled: enabled && !!questionnaireId }
    );
}

// Time comparison hook
export function useTimeComparison(
    questionnaireId: number | null,
    params?: TimeComparisonParams,
    enabled: boolean = true
) {
    return useApi<TimeComparisonData>(
        questionnaireId ? `/api/v1/analytics/comparison/${questionnaireId}` : null,
        {
            enabled: enabled && !!questionnaireId,
            params,
        }
    );
}

// Analytics summary hook
export function useAnalyticsSummary(questionnaireId: number | null, enabled: boolean = true) {
    return useApi<AnalyticsSummaryData>(
        questionnaireId ? `/api/v1/analytics/summary/${questionnaireId}` : null,
        { enabled: enabled && !!questionnaireId }
    );
}

// Analytics dashboard hook
export function useAnalyticsDashboard(questionnaireId: number | null, period: string = 'week', enabled: boolean = true) {
    return useApi<AnalyticsDashboardData>(
        questionnaireId ? `/api/v1/analytics/dashboard/${questionnaireId}?period=${period}` : null,
        { enabled: enabled && !!questionnaireId }
    );
}

// Real-time analytics hook with polling
export function useRealTimeAnalytics(questionnaireId: number | null, enabled: boolean = true) {
    return useRealTime<BubbleAnalytics>(
        questionnaireId ? `/api/v1/analytics/realtime/${questionnaireId}` : null,
        30000, // 30 seconds
        enabled && !!questionnaireId
    );
}

// Analytics export hook
export function useAnalyticsExport() {
    const { download, loading, error } = useDownload();

    const exportReport = async (
        questionnaireId: number,
        options: {
            format: 'csv' | 'excel';
            includeComparison?: boolean;
            includeRawData?: boolean;
        }
    ) => {
        const filename = `analytics-report-${questionnaireId}.${options.format}`;
        await download(
            `/api/v1/analytics/report/${questionnaireId}?format=${options.format}&includeComparison=${options.includeComparison}&includeRawData=${options.includeRawData}`,
            filename
        );
    };

    return { exportReport, loading, error };
}

// Analytics data transformer
export function useAnalyticsTransformer() {
    const transformBubbleData = (data: BubbleAnalytics | null) => {
        if (!data) return null;

        // Transform to match existing UI expectations
        return {
            categories: data.categories.map(cat => ({
                name: cat.name,
                rating: cat.rating,
                responseCount: cat.response_count,
                responseRate: cat.response_rate,
                color: cat.color,
                trend: cat.trend,
            })),
            totalResponses: data.total_responses,
            responseRate: data.response_rate,
            periodComparison: data.period_comparison,
            generatedAt: data.generated_at,
        };
    };

    const transformForDashboard = (data: BubbleAnalytics | null) => {
        if (!data) {
            // Generate default trend data for empty state
            const trendData: Array<{ date: string; 'Average Rating': number }> = [];
            const now = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                trendData.push({
                    date: date.toISOString().split('T')[0],
                    'Average Rating': 0
                });
            }
            return {
                kpiData: { avgRating: "0.0", totalReviews: 0, responseRate: 0 },
                trendData
            };
        }

        // Calculate average rating from categories
        const avgRating = (data.categories && Array.isArray(data.categories) && data.categories.length > 0)
            ? data.categories.reduce((sum, cat) => sum + cat.rating, 0) / data.categories.length
            : 0;

        const kpiData = {
            avgRating: avgRating.toFixed(1),
            totalReviews: data.total_responses,
            responseRate: Math.round(data.response_rate)
        };

        // Generate trend data (flat for empty state, could be from API)
        const trendData: Array<{ date: string; 'Average Rating': number }> = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            trendData.push({
                date: date.toISOString().split('T')[0],
                'Average Rating': avgRating // Flat line for empty state
            });
        }

        return { kpiData, trendData };
    };

    const transformTimeComparisonData = (data: TimeComparisonData | null) => {
        if (!data) return null;

        return {
            currentPeriod: {
                categories: data.current_period.categories.map(cat => ({
                    name: cat.name,
                    rating: cat.rating,
                    responseCount: cat.response_count,
                    responseRate: cat.response_rate,
                    color: cat.color,
                    trend: cat.trend,
                })),
            },
            previousPeriod: {
                categories: data.previous_period.categories.map(cat => ({
                    name: cat.name,
                    rating: cat.rating,
                    responseCount: cat.response_count,
                    responseRate: cat.response_rate,
                    color: cat.color,
                    trend: cat.trend,
                })),
            },
            trendAnalysis: data.trend_analysis,
        };
    };

    const transformForAnalyticsComponent = (data: BubbleAnalytics | null) => {
        if (!data) {
            return {
                sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
                topicAnalysis: { positive: [], negative: [] }
            };
        }

        // Calculate sentiment distribution based on ratings
        const categories = data.categories;
        const totalCategories = categories.length;

        if (totalCategories === 0) {
            return {
                sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
                topicAnalysis: { positive: [], negative: [] }
            };
        }

        let positive = 0, neutral = 0, negative = 0;
        const positiveTopics: Array<{ topic: string; count: number }> = [];
        const negativeTopics: Array<{ topic: string; count: number }> = [];

        categories.forEach(cat => {
            // Assuming rating scale 1-5, positive >3.5, neutral 2.5-3.5, negative <2.5
            if (cat.rating > 3.5) {
                positive++;
                positiveTopics.push({ topic: cat.name, count: cat.response_count });
            } else if (cat.rating >= 2.5) {
                neutral++;
            } else {
                negative++;
                negativeTopics.push({ topic: cat.name, count: cat.response_count });
            }
        });

        const sentimentDistribution = {
            positive: Math.round((positive / totalCategories) * 100),
            neutral: Math.round((neutral / totalCategories) * 100),
            negative: Math.round((negative / totalCategories) * 100),
        };

        // Sort topics by response count
        positiveTopics.sort((a, b) => b.count - a.count);
        negativeTopics.sort((a, b) => b.count - a.count);

        const topicAnalysis = {
            positive: positiveTopics,
            negative: negativeTopics,
        };

        return { sentimentDistribution, topicAnalysis };
    };

    return { transformBubbleData, transformForDashboard, transformTimeComparisonData, transformForAnalyticsComponent };
}

// Client-side caching hook
export function useAnalyticsCache() {
    const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

    const get = (key: string) => {
        const item = cache.get(key);
        if (!item) return null;

        const now = Date.now();
        if (now - item.timestamp > item.ttl) {
            cache.delete(key);
            return null;
        }

        return item.data;
    };

    const set = (key: string, data: any, ttl: number = 300000) => { // 5 minutes default
        cache.set(key, { data, timestamp: Date.now(), ttl });
    };

    const clear = (key?: string) => {
        if (key) {
            cache.delete(key);
        } else {
            cache.clear();
        }
    };

    return { get, set, clear };
}