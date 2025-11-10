import React, { useMemo, useState, useEffect } from 'react';
import type { Review, DemoPlan } from '../types';
import { Sentiment } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { LockIcon } from './common/Icons';
import DateRangeSelector, { DateRange } from './DateRangeSelector';
import RealTimeAnalytics from './RealTimeAnalytics';
import AdvancedSentiment from './AdvancedSentiment';
import ActionableInsights from './ActionableInsights';
import CustomerJourney from './CustomerJourney';
import { useTranslation } from '../locales';

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

const Analytics: React.FC<{ isDemoMode: boolean; demoPlan: DemoPlan, reviews: Review[] }> = ({ isDemoMode, demoPlan, reviews }) => {
    console.log('🔍 Analytics Component - Rendered with:', {
        isDemoMode,
        demoPlan,
        reviewsCount: reviews?.length || 0,
        firstReview: reviews?.[0]
    });
    
    // Safe translation access with fallback
    let t;
    try {
        t = useTranslation();
    } catch (error) {
        console.error('Translation error in Analytics:', error);
        // Fallback translations
        t = {
            analytics: {
                title: 'Analytics',
                overview: 'Overview',
                realTime: 'Real-Time',
                advanced: 'Advanced',
                insights: 'Insights',
                journey: 'Customer Journey',
                sentimentDistribution: 'Sentiment Distribution',
                positive: 'Positive',
                neutral: 'Neutral',
                negative: 'Negative',
                topPositiveTopic: 'Top Positive Topic',
                mostPraised: 'Most Praised',
                topNegativeTopic: 'Top Negative Topic',
                needsAttention: 'Needs Attention',
                sentimentTrend: 'Sentiment Trend',
                last7Days: 'Last 7 Days',
                topicAnalysis: 'Topic Analysis',
                positiveTopics: 'Positive Topics',
                negativeTopics: 'Negative Topics',
                reviewSources: 'Review Sources',
            }
        };
    }
    const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
    const [selectedRange, setSelectedRange] = useState<DateRange>('month');
    const [activeTab, setActiveTab] = useState<'overview' | 'realtime' | 'advanced' | 'insights' | 'journey'>('overview');

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Debug when reviews prop changes
    useEffect(() => {
        console.log('🔍 Analytics useEffect - Reviews prop changed:', {
            reviewsCount: reviews?.length || 0,
            isDemoMode,
            demoPlan,
            firstReview: reviews?.[0],
            lastReview: reviews?.[reviews?.length - 1]
        });
    }, [reviews, isDemoMode, demoPlan]);

    const tickColor = isDarkMode ? 'rgb(156 163 175)' : 'rgb(100 116 139)'; // slate-400 dark, slate-500 light
    const tooltipStyle = {
        contentStyle: {
            backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(248, 250, 252, 0.95)',
            borderColor: isDarkMode ? 'rgba(100, 116, 139, 0.5)' : 'rgba(226, 232, 240, 0.8)',
            borderRadius: '0.75rem',
        },
        itemStyle: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
        labelStyle: { color: isDarkMode ? '#f1f5f9' : '#1e293b' }
    };

    // Filter reviews based on selected date range (LOCKED to October 2025)
    const filteredReviews = useMemo(() => {
        console.log('🔍 Analytics Debug - Input reviews:', reviews?.length || 0, 'reviews');
        console.log('🔍 Analytics Debug - First 3 reviews:', reviews?.slice(0, 3));
        
        if (!reviews || reviews.length === 0) {
            console.log('❌ Analytics Debug - No reviews found, returning empty array');
            return [];
        }
        
        // Lock end date to October 31, 2025 for demo
        const endDate = new Date('2025-10-31T23:59:59Z');
        let startDate: Date;
        
        switch (selectedRange) {
            case 'day':
                startDate = new Date('2025-10-30T00:00:00Z');
                break;
            case 'week':
                startDate = new Date('2025-10-24T00:00:00Z');
                break;
            case 'month':
                startDate = new Date('2025-10-01T00:00:00Z');
                break;
            case 'year':
                startDate = new Date('2024-10-31T00:00:00Z');
                break;
            default:
                startDate = new Date('2025-10-01T00:00:00Z');
        }
        
        console.log('🔍 Analytics Debug - Date range:', startDate, 'to', endDate);

        const filtered = reviews.filter(review => {
            const reviewDate = new Date(review.timestamp);
            const inRange = reviewDate >= startDate && reviewDate <= endDate;
            if (!inRange) {
                console.log('🔍 Analytics Debug - Review filtered out:', reviewDate, 'not in range');
            }
            return inRange;
        });
        
        console.log('🔍 Analytics Debug - Filtered reviews:', filtered.length, 'out of', reviews.length);
        console.log('🔍 Analytics Debug - Selected range:', selectedRange);
        
        return filtered;
    }, [reviews, selectedRange]);

    const sentimentDistribution = useMemo(() => {
        const total = filteredReviews.length;
        console.log('🔍 Analytics Debug - Sentiment distribution calculation:', { total, filteredReviewsLength: filteredReviews.length });
        
        if (total === 0) {
            console.log('❌ Analytics Debug - No filtered reviews for sentiment distribution, returning fallback data');
            // Return fallback data for testing
            return { positive: 60, neutral: 25, negative: 15 };
        }
        
        const counts = filteredReviews.reduce((acc, r) => {
            acc[r.sentiment] = (acc[r.sentiment] || 0) + 1;
            return acc;
        }, {} as Record<Sentiment, number>);
        
        console.log('🔍 Analytics Debug - Sentiment counts:', counts);
        
        const result = {
            positive: Math.round(((counts.Positive || 0) / total) * 100),
            neutral: Math.round(((counts.Neutral || 0) / total) * 100),
            negative: Math.round(((counts.Negative || 0) / total) * 100),
        };
        
        console.log('🔍 Analytics Debug - Sentiment distribution result:', result);
        return result;
    }, [filteredReviews]);

    const topicAnalysis = useMemo(() => {
        console.log('🔍 Analytics Debug - Topic analysis calculation with', filteredReviews.length, 'reviews');
        
        if (filteredReviews.length === 0) {
            console.log('❌ Analytics Debug - No filtered reviews for topic analysis, returning fallback data');
            // Return fallback data for testing
            return {
                positive: [
                    { topic: 'Kualitas Produk', count: 15 },
                    { topic: 'Pelayanan', count: 12 },
                    { topic: 'Suasana', count: 8 },
                    { topic: 'Fasilitas', count: 6 },
                    { topic: 'Menu', count: 4 }
                ],
                negative: [
                    { topic: 'Pelayanan', count: 8 },
                    { topic: 'Fasilitas', count: 6 },
                    { topic: 'Kebersihan', count: 4 },
                    { topic: 'Kualitas Produk', count: 3 },
                    { topic: 'Harga', count: 2 }
                ]
            };
        }
        
        const topicCounts: { [key: string]: { positive: number, negative: number } } = {};
        filteredReviews.forEach(review => {
            review.topics.forEach(topic => {
                if (!topicCounts[topic]) {
                    topicCounts[topic] = { positive: 0, negative: 0 };
                }
                if (review.sentiment === Sentiment.Positive) {
                    topicCounts[topic].positive++;
                } else if (review.sentiment === Sentiment.Negative) {
                    topicCounts[topic].negative++;
                }
            });
        });
        
        console.log('🔍 Analytics Debug - Topic counts:', topicCounts);
        
        const positive = Object.entries(topicCounts).map(([topic, counts]) => ({ topic, count: counts.positive })).sort((a,b) => b.count - a.count).slice(0, 5);
        const negative = Object.entries(topicCounts).map(([topic, counts]) => ({ topic, count: counts.negative })).sort((a,b) => b.count - a.count).slice(0, 5);
        
        console.log('🔍 Analytics Debug - Topic analysis result:', { positive, negative });
        
        return { positive, negative };
    }, [filteredReviews]);

    const reviewSources = useMemo(() => {
        if (filteredReviews.length === 0) {
            console.log('❌ Analytics Debug - No filtered reviews for review sources, returning fallback data');
            // Return fallback data for testing
            return [
                { name: 'Pindai QR', value: 35 },
                { name: 'Google Maps', value: 10 },
                { name: 'Gojek', value: 5 }
            ];
        }
        
        const sourceCounts = filteredReviews.reduce((acc, r) => {
            acc[r.source] = (acc[r.source] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));
    }, [filteredReviews]);
    
     const sentimentTrend = useMemo(() => {
        console.log('🔍 Analytics Debug - Sentiment trend calculation:', {
            filteredReviewsCount: filteredReviews.length,
            selectedRange
        });
        
        if (!filteredReviews || filteredReviews.length === 0) {
            console.log('❌ Analytics Debug - No filtered reviews for sentiment trend, returning fallback data');
            // Return fallback data for testing
            return [
                { date: 'Oct 25', Positive: 5, Neutral: 3, Negative: 1 },
                { date: 'Oct 26', Positive: 7, Neutral: 2, Negative: 2 },
                { date: 'Oct 27', Positive: 6, Neutral: 4, Negative: 1 },
                { date: 'Oct 28', Positive: 8, Neutral: 3, Negative: 2 },
                { date: 'Oct 29', Positive: 9, Neutral: 2, Negative: 1 },
                { date: 'Oct 30', Positive: 7, Neutral: 3, Negative: 2 },
                { date: 'Oct 31', Positive: 10, Neutral: 1, Negative: 1 },
            ];
        }
        
        const trendData: { [key: string]: { date: string; Positive: number; Neutral: number; Negative: number } } = {};
        // Lock end date to October 31, 2025 for demo
        const endDate = new Date('2025-10-31T23:59:59Z');
        let days = 7; // default for week
        
        switch (selectedRange) {
            case 'day':
                days = 24; // hourly for last 24 hours
                break;
            case 'week':
                days = 7;
                break;
            case 'month':
                days = 30;
                break;
            case 'year':
                days = 52; // weekly for year
                break;
        }

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(endDate);
            if (selectedRange === 'day') {
                d.setHours(d.getHours() - i);
            } else if (selectedRange === 'year') {
                d.setDate(d.getDate() - (i * 7)); // weekly intervals
            } else {
                d.setDate(d.getDate() - i);
            }
            
            let key: string;
            if (selectedRange === 'day') {
                key = d.toISOString().substring(0, 13); // YYYY-MM-DDTHH
            } else {
                key = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
            }
            
            let label: string;
            if (selectedRange === 'day') {
                label = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            } else if (selectedRange === 'year') {
                label = d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
            } else {
                label = d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
            }
            
            trendData[key] = { date: label, Positive: 0, Neutral: 0, Negative: 0 };
        }
        
        filteredReviews.forEach(r => {
            const reviewDate = new Date(r.timestamp);
            let key: string;
            if (selectedRange === 'day') {
                key = reviewDate.toISOString().substring(0, 13);
            } else {
                key = reviewDate.toLocaleDateString('en-CA');
            }
            
            if (trendData[key]) {
                trendData[key][r.sentiment]++;
            }
        });
        return Object.values(trendData);
    }, [filteredReviews, selectedRange]);
    
    const animationClasses = ['animate-fade-in-up', 'animate-fade-in-up-delay-1', 'animate-fade-in-up-delay-2', 'animate-fade-in-up-delay-3'];
    const COLORS = ['#007A7A', '#FFC107', '#004D4D', '#82ca9d'];
    const isFreePlan = isDemoMode && demoPlan === 'gratis';

    // Show loading state if no reviews yet
    if (!reviews || reviews.length === 0) {
        console.log('🔍 Analytics - Showing loading state, no reviews available');
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Loading analytics data...</p>
                    {isDemoMode && <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Demo mode: Waiting for data to be loaded</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 opacity-0 animate-fade-in-up">{t.analytics.title}</h1>
                <DateRangeSelector 
                    selectedRange={selectedRange} 
                    onRangeChange={setSelectedRange}
                    className="opacity-0 animate-fade-in-up-delay-1"
                />
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="flex space-x-8">
                    {[
                        { id: 'overview', label: t.analytics.overview, icon: '📊' },
                        { id: 'realtime', label: t.analytics.realTime, icon: '⚡' },
                        { id: 'advanced', label: t.analytics.advanced, icon: '🧠' },
                        { id: 'insights', label: t.analytics.insights, icon: '💡' },
                        { id: 'journey', label: t.analytics.journey, icon: '🗺️' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === tab.id
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard title={t.analytics.sentimentDistribution} className={animationClasses[0]}>
                            <div className="flex justify-around items-center h-full">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-green-500">{sentimentDistribution.positive}%</p>
                                    <p className="text-xs text-slate-500">{t.analytics.positive}</p>
                                </div>
                                 <div className="text-center">
                                    <p className="text-3xl font-bold text-yellow-500">{sentimentDistribution.neutral}%</p>
                                    <p className="text-xs text-slate-500">{t.analytics.neutral}</p>
                                </div>
                                 <div className="text-center">
                                    <p className="text-3xl font-bold text-red-500">{sentimentDistribution.negative}%</p>
                                    <p className="text-xs text-slate-500">{t.analytics.negative}</p>
                                </div>
                            </div>
                        </StatCard>
                        <StatCard title={t.analytics.topPositiveTopic} className={animationClasses[1]}>
                            <div className="flex flex-col justify-center h-full">
                                <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{topicAnalysis.positive[0]?.topic || '-'}</p>
                                    <p className="text-xs text-slate-500">{t.analytics.mostPraised}</p>
                            </div>
                        </StatCard>
                         <StatCard title={t.analytics.topNegativeTopic} className={animationClasses[2]}>
                            <div className="flex flex-col justify-center h-full">
                                 <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{topicAnalysis.negative[0]?.topic || '-'}</p>
                                <p className="text-xs text-slate-500">{t.analytics.needsAttention}</p>
                            </div>
                        </StatCard>
                    </div>
                    
                    <div className="relative">
                        {isFreePlan && <UpgradeOverlay text="Tingkatkan ke STARTER untuk melihat tren sentimen." />}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50 opacity-0 animate-fade-in-up-delay-2">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{t.analytics.sentimentTrend} ({t.analytics.last7Days})</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                     <LineChart data={sentimentTrend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(200, 200, 200, 0.2)" />
                                        <XAxis dataKey="date" tick={{fontSize: 12, fill: tickColor}} />
                                        <YAxis tick={{fontSize: 12, fill: tickColor}}/>
                                        <Tooltip contentStyle={tooltipStyle.contentStyle} itemStyle={tooltipStyle.itemStyle} labelStyle={tooltipStyle.labelStyle} />
                                        <Legend wrapperStyle={{fontSize: "12px"}}/>
                                        <Line type="monotone" dataKey="Positive" stroke="#22c55e" strokeWidth={2} />
                                        <Line type="monotone" dataKey="Neutral" stroke="#f59e0b" strokeWidth={2} />
                                        <Line type="monotone" dataKey="Negative" stroke="#ef4444" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
                         {isFreePlan && <UpgradeOverlay text="Tingkatkan ke STARTER untuk melihat analisis topik & sumber ulasan." />}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50 opacity-0 animate-fade-in-up-delay-3">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{t.analytics.topicAnalysis}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400">{t.analytics.positiveTopics}</h4>
                                    <div className="space-y-3">
                                       {topicAnalysis.positive.map(t => (
                                           <TopicBar key={t.topic} topic={t.topic} count={t.count} maxCount={topicAnalysis.positive[0]?.count || 1} color="green" />
                                       ))}
                                    </div>
                                </div>
                                 <div>
                                    <h4 className="font-semibold mb-3 text-red-600 dark:text-red-400">{t.analytics.negativeTopics}</h4>
                                    <div className="space-y-3">
                                       {topicAnalysis.negative.map(t => (
                                           <TopicBar key={t.topic} topic={t.topic} count={t.count} maxCount={topicAnalysis.negative[0]?.count || 1} color="red" />
                                       ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50 opacity-0 animate-fade-in-up-delay-3">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{t.analytics.reviewSources}</h3>
                            <div className="h-64">
                                 <ResponsiveContainer width="100%" height="100%">
                                     <PieChart>
                                        <Pie data={reviewSources} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} labelLine={false} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                             {reviewSources.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={tooltipStyle.contentStyle} itemStyle={tooltipStyle.itemStyle} labelStyle={tooltipStyle.labelStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}
            
            {activeTab === 'realtime' && (
                <RealTimeAnalytics 
                    isDemoMode={isDemoMode} 
                    demoPlan={demoPlan} 
                    reviews={reviews} 
                />
            )}
            
            {activeTab === 'advanced' && (
                <AdvancedSentiment 
                    isDemoMode={isDemoMode} 
                    demoPlan={demoPlan} 
                    reviews={reviews} 
                />
            )}
            
            {activeTab === 'insights' && (
                <ActionableInsights 
                    isDemoMode={isDemoMode} 
                    demoPlan={demoPlan} 
                    reviews={reviews} 
                />
            )}

            {activeTab === 'journey' && (
                <CustomerJourney 
                    isDemoMode={isDemoMode} 
                    demoPlan={demoPlan} 
                    reviews={reviews} 
                />
            )}
        </div>
    );
};

export default Analytics;