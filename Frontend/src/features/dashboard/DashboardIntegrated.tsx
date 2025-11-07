import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { TrendData, Page } from '../../types';
import { PlusIcon, LightBulbIcon, CloseIcon } from '../../components/ui/Icons';
import * as analyticsHooks from '../../hooks/api/useAnalytics';
import { generateMockBubbleAnalytics, generateMockAnalyticsSummary, generateMockTimeComparison } from '../../hooks/ui/useMockData';
import KPICard, { KPI } from './KPICard';

interface DashboardIntegratedProps {
  questionnaireId: number;
  setActivePage: (page: Page) => void;
  onGenerateData?: () => void; // Keep for compatibility, but may not be needed with real data
  isDemoMode?: boolean;
}

const DashboardIntegrated: React.FC<DashboardIntegratedProps> = ({
  questionnaireId,
  setActivePage,
  onGenerateData,
  isDemoMode = false
}) => {
  const [showGuidance, setShowGuidance] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  // Get analytics data - use mock data in demo mode
  const { data: bubbleAnalytics, loading: analyticsLoading, error: analyticsError } = analyticsHooks.useBubbleAnalytics(questionnaireId, !isDemoMode && !!questionnaireId);
  const { data: summaryData, loading: summaryLoading, error: summaryError } = analyticsHooks.useAnalyticsSummary(questionnaireId, !isDemoMode && !!questionnaireId);
  const { data: timeComparisonData, loading: comparisonLoading, error: comparisonError } = analyticsHooks.useTimeComparison(questionnaireId, { comparison_type: 'week_over_week' }, !isDemoMode && !!questionnaireId);
  const { transformForDashboard } = analyticsHooks.useAnalyticsTransformer();

  // Mock data for demo mode
  const mockBubbleAnalytics = useMemo(() => generateMockBubbleAnalytics(questionnaireId || 1), [questionnaireId]);
  const mockSummaryData = useMemo(() => generateMockAnalyticsSummary(questionnaireId || 1), [questionnaireId]);
  const mockTimeComparisonData = useMemo(() => generateMockTimeComparison(questionnaireId || 1), [questionnaireId]);

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
      labelStyle: { color: isDarkMode ? '#f1f5f9' : '#1e293b' }
  };

  // Transform data for compatibility with existing UI
  const { kpiData, trendData, trendChanges } = useMemo(() => {
    const dataToUse = isDemoMode ? mockBubbleAnalytics : bubbleAnalytics;
    const summaryToUse = isDemoMode ? mockSummaryData : summaryData;
    const comparisonToUse = isDemoMode ? mockTimeComparisonData : timeComparisonData;

    if (!dataToUse) {
      const { kpiData, trendData } = transformForDashboard(null);
      return {
        kpiData,
        trendData,
        trendChanges: { totalReviewsChange: 0, responseRateChange: 0 }
      };
    }

    // Use the transformer to convert data to expected format
    const { kpiData: transformedKpiData, trendData: transformedTrendData } = transformForDashboard(dataToUse);

    // Calculate trend changes
    let totalReviewsChange = 0;
    let responseRateChange = 0;

    if (comparisonToUse && comparisonToUse.current_period && comparisonToUse.previous_period) {
      // Calculate total reviews change
      const currentTotal = comparisonToUse.current_period.categories.reduce((sum, cat) => sum + cat.response_count, 0);
      const previousTotal = comparisonToUse.previous_period.categories.reduce((sum, cat) => sum + cat.response_count, 0);
      totalReviewsChange = currentTotal - previousTotal;

      // Calculate response rate change
      const currentAvgResponseRate = comparisonToUse.current_period.categories.reduce((sum, cat) => sum + cat.response_rate, 0) / comparisonToUse.current_period.categories.length;
      const previousAvgResponseRate = comparisonToUse.previous_period.categories.reduce((sum, cat) => sum + cat.response_rate, 0) / comparisonToUse.previous_period.categories.length;
      responseRateChange = currentAvgResponseRate - previousAvgResponseRate;
    }

    return {
      kpiData: transformedKpiData,
      trendData: transformedTrendData,
      trendChanges: { totalReviewsChange, responseRateChange }
    };
  }, [bubbleAnalytics, summaryData, timeComparisonData, transformForDashboard, isDemoMode, mockBubbleAnalytics, mockSummaryData, mockTimeComparisonData]);
  
  // Animation classes for KPI cards
  const animationClasses = ['animate-fade-in-up', 'animate-fade-in-up-delay-1', 'animate-fade-in-up-delay-2'];

  // Generate KPI cards with real data
  const kpis: (KPI & { pageLink?: Page })[] = useMemo(() => {
    const totalReviewsChangeStr = trendChanges.totalReviewsChange > 0 ? `+${trendChanges.totalReviewsChange}` : trendChanges.totalReviewsChange.toString();
    const responseRateChangeStr = trendChanges.responseRateChange > 0 ? `+${trendChanges.responseRateChange.toFixed(1)}%` : `${trendChanges.responseRateChange.toFixed(1)}%`;

    const starIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.522 4.646a1 1 0 00.95.69h4.904c.969 0 1.371 1.24.588 1.81l-3.968 2.88a1 1 0 00-.364 1.118l1.522 4.646c.3.921-.755 1.688-1.539 1.118l-3.968-2.88a1 1 0 00-1.175 0l-3.968 2.88c-.784.57-1.838-.197-1.539-1.118l1.522-4.646a1 1 0 00-.364-1.118L2.08 9.073c-.783-.57-.38-1.81.588-1.81h4.904a1 1 0 00.95-.69L11.049 2.927z" /></svg>;
    const reviewsIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V7a2 2 0 012-2h4M5 8h2" /></svg>;
    const responseIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 4h10a8 8 0 008 8v2" /></svg>;

    return [
      {
        title: 'Rating Rata-rata',
        value: kpiData.avgRating,
        icon: starIcon,
        change: summaryData?.overallTrend === 'improving' ? '+0.1' : summaryData?.overallTrend === 'declining' ? '-0.1' : '0.0',
        changeType: summaryData?.overallTrend === 'improving' ? 'increase' : summaryData?.overallTrend === 'declining' ? 'decrease' : 'increase',
        pageLink: 'analytics'
      },
      {
        title: 'Total Respons',
        value: kpiData.totalReviews,
        icon: reviewsIcon,
        change: totalReviewsChangeStr,
        changeType: trendChanges.totalReviewsChange >= 0 ? 'increase' : 'decrease',
        pageLink: 'inbox'
      },
      {
        title: 'Tingkat Respons',
        value: `${kpiData.responseRate}%`,
        icon: responseIcon,
        change: responseRateChangeStr,
        changeType: trendChanges.responseRateChange >= 0 ? 'increase' : 'decrease',
        pageLink: 'analytics'
      },
      {
        title: 'Sentimen Positif',
        value: '85%',
        icon: starIcon,
        change: '+2.1%',
        changeType: 'increase',
        pageLink: 'analytics'
      },
    ];
  }, [kpiData, summaryData, trendChanges]);



  // Loading state (skip for demo mode)
  if (!isDemoMode && (analyticsLoading || summaryLoading || comparisonLoading)) {
    return (
      <div className="space-y-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
        </div>
      </div>
    );
  }

  // Error state (skip for demo mode)
  if (!isDemoMode && (analyticsError || summaryError || comparisonError)) {
    return (
      <div className="space-y-8">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Analytics</h3>
          <p className="text-red-600 dark:text-red-300">
            {analyticsError?.message || summaryError?.message || comparisonError?.message || 'Failed to load analytics data. Please try again.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
         <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
         {onGenerateData && (
           <button
             onClick={onGenerateData}
             className="flex items-center text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-md transition-colors"
           >
               <PlusIcon className="w-4 h-4 mr-2" />
               Simulasikan Data Masuk
           </button>
         )}
       </div>

       {/* KPI Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {kpis.map((kpi, index) => (
           <KPICard
             key={kpi.title}
             kpi={kpi}
             className={animationClasses[index % 3]}
           />
         ))}
       </div>

        {/* Trend Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Rating Trends</h2>
          <div className="h-64">
            {trendData && trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
               <defs>
                 <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#007A7A" stopOpacity={0.8}/>
                   <stop offset="95%" stopColor="#007A7A" stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgb(71 85 105)' : 'rgb(226 232 240)'} />
               <XAxis 
                 dataKey="date" 
                 stroke={tickColor}
                 tick={{ fontSize: 12 }}
               />
               <YAxis 
                 stroke={tickColor}
                 tick={{ fontSize: 12 }}
                 domain={[0, 5]}
               />
               <Tooltip {...tooltipStyle} />
               <Area 
                 type="monotone" 
                 dataKey="Average Rating" 
                 stroke="#007A7A" 
                 fillOpacity={1} 
                 fill="url(#colorRating)" 
                 strokeWidth={2}
               />
              </AreaChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                <p>No trend data available</p>
              </div>
            )}
          </div>
        </div>
     </div>
  );
};

export default DashboardIntegrated;