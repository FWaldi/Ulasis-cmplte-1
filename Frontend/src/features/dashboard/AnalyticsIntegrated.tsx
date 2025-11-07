import React, { useState, useEffect, useMemo } from 'react';
import type { DemoPlan, TrendData, BreakdownData, AnalyticsDashboardData } from '../../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getMockData, generateMockBubbleAnalytics, generateMockAnalyticsSummary } from '../../hooks/ui/useMockData';
import { useBubbleAnalytics, useAnalyticsSummary, useAnalyticsDashboard, useAnalyticsExport } from '../../hooks/api/useAnalytics';
import { useAnalyticsTransformer } from '../../hooks/api/useAnalytics';
// Temporary inline icon to fix import issues
const LockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
);

const UpgradeOverlay: React.FC<{ text: string }> = ({ text }) => (
    <div className="absolute inset-0 bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
        <LockIcon className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-2" />
        <p className="font-bold text-slate-700 dark:text-slate-200 text-center max-w-xs">{text}</p>
    </div>
);

const StatCard: React.FC<{ title: string; children: React.ReactNode; className: string; }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50 opacity-0 ${className}`}>
        <h3 className="text-md font-semibold text-slate-600 dark:text-slate-400 mb-2">{title}</h3>
        {children}
    </div>
);

const TopicBar: React.FC<{ topic: string; count: number; maxCount: number; color: 'green' | 'red'; }> = ({ topic, count, maxCount, color }) => {
    const percentage = (count / maxCount) * 100;
    const bgColor = color === 'green' ? 'bg-green-500' : 'bg-red-500';

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{topic}</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{count}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div className={`${bgColor} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const KPICard: React.FC<{ title: string; value: string | number; trend: { change: number; direction: 'up' | 'down' }; className: string; periodLabel: string; }> = ({ title, value, trend, className, periodLabel }) => {
    const displayChange = isNaN(trend.change) ? 0 : Math.abs(trend.change);

    return (
        <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50 opacity-0 ${className}`}>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">{title}</h3>
            <div className="flex items-baseline justify-between">
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                <div className={`flex items-center text-sm ${trend.direction === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {trend.direction === 'up' ? '↑' : '↓'} {displayChange}%
                </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">vs. {periodLabel}</p>
        </div>
    );
};

const TimePeriodSelector: React.FC<{
    selectedPeriod: TimePeriod;
    onPeriodChange: (period: TimePeriod) => void;
    className?: string;
}> = ({ selectedPeriod, onPeriodChange, className }) => {
    const periods = [
        { value: 'day' as TimePeriod, label: 'Hari Terakhir' },
        { value: 'week' as TimePeriod, label: 'Minggu Terakhir' },
        { value: 'month' as TimePeriod, label: 'Bulan Terakhir' },
        { value: 'year' as TimePeriod, label: 'Tahun Terakhir' }
    ];

    return (
        <div className={`relative ${className}`}>
            <select
                value={selectedPeriod}
                onChange={(e) => onPeriodChange(e.target.value as TimePeriod)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
                {periods.map((period) => (
                    <option key={period.value} value={period.value}>
                        {period.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

const DataTable: React.FC<{ data: BreakdownData[]; className: string; }> = ({ data, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50 opacity-0 ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Rincian Detail</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 text-slate-600 dark:text-slate-400">Area Perbaikan</th>
                        <th className="text-left py-2 text-slate-600 dark:text-slate-400">Rating Rata-rata</th>
                        <th className="text-left py-2 text-slate-600 dark:text-slate-400">Respons</th>
                        <th className="text-left py-2 text-slate-600 dark:text-slate-400">Tren (WoW)</th>
                        <th className="text-left py-2 text-slate-600 dark:text-slate-400">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, index) => (
                        <tr key={index} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="py-3 text-slate-800 dark:text-slate-100">{row.area}</td>
                            <td className="py-3 text-slate-800 dark:text-slate-100">{row.avgRating}</td>
                            <td className="py-3 text-slate-800 dark:text-slate-100">{row.responses}</td>
                            <td className={`py-3 ${row.trend.direction === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                                {row.trend.direction === 'up' ? '↑' : '↓'} {Math.abs(row.trend.change)}%
                            </td>
                            <td className="py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    row.status === 'Good' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    row.status === 'Monitor' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                    {row.status === 'Good' ? 'Baik' : row.status === 'Monitor' ? 'Pantau' : 'Urgent'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

type TimePeriod = 'day' | 'week' | 'month' | 'year';

interface AnalyticsIntegratedProps {
    questionnaireId: number;
    isDemoMode: boolean;
    demoPlan: DemoPlan;
}

const AnalyticsIntegrated: React.FC<AnalyticsIntegratedProps> = ({ questionnaireId, isDemoMode, demoPlan }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week');

    // Get analytics data - use mock data in demo mode
    const { data: bubbleAnalytics, loading: analyticsLoading, error: analyticsError } = useBubbleAnalytics(questionnaireId, !isDemoMode);
    const { data: summaryData, loading: summaryLoading, error: summaryError } = useAnalyticsDashboard(questionnaireId, selectedPeriod, !isDemoMode);
    const { transformForAnalyticsComponent } = useAnalyticsTransformer();
    const { exportReport, loading: exportLoading, error: exportError } = useAnalyticsExport();

    // Get mock data for demo mode or fallback
    const mockData = useMemo(() => getMockData(demoPlan, selectedPeriod), [demoPlan, selectedPeriod]);

    // Transform data for compatibility with existing UI
    const { kpiData, trendData, breakdownData } = useMemo(() => {
        if (isDemoMode) {
            const mockBubbleData = generateMockBubbleAnalytics(questionnaireId);
            const mockSummaryData = generateMockAnalyticsSummary(questionnaireId);

            // Transform mock bubble data to match expected format
            const avgRating = mockBubbleData.categories && mockBubbleData.categories.length > 0
                ? mockBubbleData.categories.reduce((sum, cat) => sum + cat.rating, 0) / mockBubbleData.categories.length
                : 0;

            const positiveCategories = mockBubbleData.categories && mockBubbleData.categories.length > 0
                ? mockBubbleData.categories.filter(cat => cat.rating >= 3.5)
                : [];
            const positiveSentiment = mockBubbleData.categories && mockBubbleData.categories.length > 0
                ? Math.round((positiveCategories.length / mockBubbleData.categories.length) * 100)
                : 0;

            const kpiData = {
                totalResponses: mockBubbleData.total_responses || 0,
                avgRating: Math.round(avgRating * 10) / 10,
                responseRate: Math.round(mockBubbleData.response_rate || 0),
                positiveSentiment,
                trends: {
                    totalResponses: { value: mockBubbleData.total_responses || 0, change: 0 },
                    avgRating: { value: avgRating, change: 0 },
                    responseRate: { value: mockBubbleData.response_rate || 0, change: 0 },
                    positiveSentiment: { value: positiveSentiment, change: 0 },
                }
            };

            // Generate trend data
            const trendData: TrendData[] = [];
            const now = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                trendData.push({
                    date: date.toLocaleDateString('id-ID', { weekday: 'short' }),
                    'Avg Rating': avgRating,
                    'Response Rate': mockBubbleData.response_rate || 0,
                });
            }

            // Transform breakdown data
            const breakdownData = mockBubbleData.categories && mockBubbleData.categories.length > 0
                ? mockBubbleData.categories.map(cat => {
                    const change = Math.random() * 10 - 5;
                    const direction = change >= 0 ? 'up' as const : 'down' as const;

                    let status: 'Good' | 'Monitor' | 'Urgent';
                    const absChange = Math.abs(change);
                    if (absChange > 3) {
                        status = direction === 'up' ? 'Good' : 'Urgent';
                    } else if (absChange > 1) {
                        status = 'Monitor';
                    } else {
                        status = 'Good';
                    }

                    return {
                        area: cat.name,
                        avgRating: `${cat.rating.toFixed(1)} / 5`,
                        responses: cat.response_count,
                        trend: { change: absChange, direction },
                        status
                    };
                })
                : [];

            return { kpiData, trendData, breakdownData };
        }

        if (!bubbleAnalytics) {
            return {
                kpiData: {
                    totalResponses: 0,
                    avgRating: 0,
                    responseRate: 0,
                    positiveSentiment: 0,
                    trends: {
                        totalResponses: { value: 0, change: 0 },
                        avgRating: { value: 0, change: 0 },
                        responseRate: { value: 0, change: 0 },
                        positiveSentiment: { value: 0, change: 0 },
                    }
                },
                trendData: [],
                breakdownData: []
            };
        }

        // Use dashboard data if available, otherwise fall back to bubble analytics
        if (summaryData && summaryData.data) {
            const dashboard = summaryData.data as AnalyticsDashboardData;
            
            const kpiData = {
                totalResponses: dashboard.kpi?.totalResponses || 0,
                avgRating: Math.round((dashboard.kpi?.avgRating || 0) * 10) / 10,
                responseRate: Math.round(dashboard.kpi?.responseRate || 0),
                positiveSentiment: dashboard.kpi?.positiveSentiment || 0,
                trends: {
                    totalResponses: { value: dashboard.kpi?.totalResponses || 0, change: 0 },
                    avgRating: { value: dashboard.kpi?.avgRating || 0, change: 0 },
                    responseRate: { value: dashboard.kpi?.responseRate || 0, change: 0 },
                    positiveSentiment: { value: dashboard.kpi?.positiveSentiment || 0, change: 0 },
                }
            };

            // Transform trend data from dashboard
            const trendData: TrendData[] = (dashboard.trends || []).map(trend => ({
                date: new Date(trend.date).toLocaleDateString('id-ID', { weekday: 'short' }),
                'Avg Rating': trend.avgRating,
                'Response Rate': trend.responseRate,
            }));

            // Transform breakdown data from dashboard
            const breakdownData = (dashboard.breakdown || []).map(item => ({
                area: item.area,
                avgRating: typeof item.avgRating === 'number' ? `${item.avgRating.toFixed(1)} / 5` : item.avgRating,
                responses: item.responses,
                trend: item.trend || { change: 0, direction: 'stable' as const },
                status: item.status || 'Good',
            }));

            return { kpiData, trendData, breakdownData };
        }

        // Fall back to bubble analytics if dashboard data is not available
        const avgRating = bubbleAnalytics.categories && bubbleAnalytics.categories.length > 0
            ? bubbleAnalytics.categories.reduce((sum, cat) => sum + cat.rating, 0) / bubbleAnalytics.categories.length
            : 0;

        const positiveCategories = bubbleAnalytics.categories && bubbleAnalytics.categories.length > 0
            ? bubbleAnalytics.categories.filter(cat => cat.rating >= 3.5)
            : [];
        const positiveSentiment = bubbleAnalytics.categories && bubbleAnalytics.categories.length > 0
            ? Math.round((positiveCategories.length / bubbleAnalytics.categories.length) * 100)
            : 0;

        const kpiData = {
            totalResponses: bubbleAnalytics.total_responses || 0,
            avgRating: Math.round(avgRating * 10) / 10,
            responseRate: Math.round(bubbleAnalytics.response_rate || 0),
            positiveSentiment,
            trends: {
                totalResponses: { value: bubbleAnalytics.total_responses || 0, change: 0 },
                avgRating: { value: avgRating, change: 0 },
                responseRate: { value: bubbleAnalytics.response_rate || 0, change: 0 },
                positiveSentiment: { value: positiveSentiment, change: 0 },
            }
        };

        // Generate trend data (flat for empty state, could be from API)
        const trendData: TrendData[] = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            trendData.push({
                date: date.toLocaleDateString('id-ID', { weekday: 'short' }),
                'Avg Rating': avgRating,
                'Response Rate': bubbleAnalytics.response_rate || 0,
            });
        }

        // Transform breakdown data
        const breakdownData = bubbleAnalytics.categories && bubbleAnalytics.categories.length > 0
            ? bubbleAnalytics.categories.map(cat => {
                const change = Math.random() * 10 - 5; // Placeholder change calculation
                const direction = change >= 0 ? 'up' as const : 'down' as const;

                let status: 'Good' | 'Monitor' | 'Urgent';
                const absChange = Math.abs(change);
                if (absChange > 3) {
                    status = direction === 'up' ? 'Good' : 'Urgent';
                } else if (absChange > 1) {
                    status = 'Monitor';
                } else {
                    status = 'Good';
                }

                return {
                    area: cat.name,
                    avgRating: `${cat.rating.toFixed(1)} / 5`,
                    responses: cat.response_count,
                    trend: { change: absChange, direction },
                    status
                };
            })
            : [];

        return { kpiData, trendData, breakdownData };
    }, [bubbleAnalytics, summaryData, isDemoMode, questionnaireId, selectedPeriod]);

    // Get period label for comparison
    const getPeriodLabel = (period: TimePeriod) => {
        switch (period) {
            case 'day': return 'kemarin';
            case 'week': return 'minggu lalu';
            case 'month': return 'bulan lalu';
            case 'year': return 'tahun lalu';
            default: return 'periode sebelumnya';
        }
    };

    const periodLabel = getPeriodLabel(selectedPeriod);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const tickColor = isDarkMode ? 'rgb(156 163 175)' : 'rgb(100 116 139)';
    const tooltipStyle = {
        contentStyle: {
            backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(248, 250, 252, 0.95)',
            borderColor: isDarkMode ? 'rgba(100, 116, 139, 0.5)' : 'rgba(226, 232, 240, 0.8)',
            borderRadius: '0.75rem',
        },
        itemStyle: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
        labelStyle: { color: isDarkMode ? '#f1f5f9' : '#1e293b' }
    };

    // Loading state (skip for demo mode)
    if (!isDemoMode && (analyticsLoading || summaryLoading)) {
        return (
            <div className="space-y-8">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
                </div>
            </div>
        );
    }

    // Error state (skip for demo mode)
    if (!isDemoMode && (analyticsError || summaryError)) {
        return (
            <div className="space-y-8">
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Analytics</h3>
                    <p className="text-red-600 dark:text-red-300">
                        {analyticsError || summaryError || 'Failed to load analytics data. Please try again.'}
                    </p>
                </div>
                {exportError && (
                    <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700/50 p-4 rounded-xl">
                        <p className="text-orange-600 dark:text-orange-300 text-sm">
                            Export failed: {exportError}
                        </p>
                    </div>
                )}
            </div>
        );
    }







    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 opacity-0 animate-fade-in-up">Analytics</h1>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => exportReport(questionnaireId, { format: 'csv', includeComparison: true, includeRawData: false })}
                        disabled={exportLoading || isDemoMode}
                        className="flex items-center text-xs font-semibold bg-brand-primary hover:bg-brand-primary/90 text-white px-3 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed opacity-0 animate-fade-in-up-delay-1"
                    >
                        {exportLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        )}
                        Export CSV
                    </button>
                    <TimePeriodSelector
                        selectedPeriod={selectedPeriod}
                        onPeriodChange={setSelectedPeriod}
                        className="opacity-0 animate-fade-in-up-delay-1"
                    />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Reviews"
                    value={kpiData.totalResponses}
                    trend={{ change: kpiData.trends.totalResponses.change, direction: kpiData.trends.totalResponses.change >= 0 ? 'up' : 'down' }}
                    periodLabel={periodLabel}
                    className="animate-fade-in-up"
                />
                <KPICard
                    title="Average Rating"
                    value={Math.round(kpiData.avgRating)}
                    trend={{ change: kpiData.trends.avgRating.change, direction: kpiData.trends.avgRating.change >= 0 ? 'up' : 'down' }}
                    periodLabel={periodLabel}
                    className="animate-fade-in-up-delay-1"
                />
                <KPICard
                    title="Response Rate"
                    value={`${kpiData.responseRate}%`}
                    trend={{ change: kpiData.trends.responseRate.change, direction: kpiData.trends.responseRate.change >= 0 ? 'up' : 'down' }}
                    periodLabel={periodLabel}
                    className="animate-fade-in-up-delay-2"
                />
                <KPICard
                    title="Sentimen Positif"
                    value={`${kpiData.positiveSentiment}%`}
                    trend={{ change: kpiData.trends.positiveSentiment.change, direction: kpiData.trends.positiveSentiment.change >= 0 ? 'up' : 'down' }}
                    periodLabel={periodLabel}
                    className="animate-fade-in-up-delay-3"
                />
            </div>

            {/* Weekly Performance Trends - Dual Axis Line Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50 opacity-0 animate-fade-in-up-delay-1">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Tren Kinerja Mingguan</h3>
                <div className="h-80 border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height={280} aspect={undefined}>
                        <LineChart data={trendData} margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(200, 200, 200, 0.2)" />
                            <XAxis dataKey="date" tick={{fontSize: 12, fill: tickColor}} />
                            <YAxis yAxisId="left" domain={[0, 5]} tick={{fontSize: 12, fill: tickColor}} label={{ value: 'Average Rating', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{fontSize: 12, fill: tickColor}} label={{ value: 'Response Rate (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }} />
                            <Tooltip contentStyle={tooltipStyle.contentStyle} itemStyle={tooltipStyle.itemStyle} labelStyle={tooltipStyle.labelStyle} />
                            <Legend wrapperStyle={{fontSize: "12px"}}/>
                            <Line yAxisId="left" type="monotone" dataKey="Avg Rating" stroke="#FFA500" strokeWidth={2} name="Average Rating" />
                            <Line yAxisId="right" type="monotone" dataKey="Response Rate" stroke="#008000" strokeWidth={2} name="Response Rate (%)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Breakdown Data Table */}
            <DataTable data={breakdownData} className="animate-fade-in-up-delay-2" />
        </div>
    );
};

export default AnalyticsIntegrated;