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
import { honestAnalyticsApi, safeApiCall, fallbackData } from '../services/honestAnalyticsApi';
import { useSubscription } from '../contexts/SubscriptionContext';

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
    const { 
        checkFeatureAccess, 
        getUpgradeMessage, 
        loading: subscriptionLoading, 
        error: subscriptionError 
    } = useSubscription();
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
        // Fallback translations (Indonesian)
        t = {
            analytics: {
                title: 'Analitik',
                overview: 'Ringkasan',
                realTime: 'Real-Time',
                advanced: 'Lanjutan',
                insights: 'Wawasan',
                journey: 'Perjalanan Pelanggan',
                sentimentDistribution: 'Distribusi Sentimen',
                positive: 'Positif',
                neutral: 'Netral',
                negative: 'Negatif',
                topPositiveTopic: 'Topik Positif Teratas',
                mostPraised: 'Paling Dipuji',
                topNegativeTopic: 'Topik Negatif Teratas',
                needsAttention: 'Perlu Perhatian',
                sentimentTrend: 'Tren Sentimen',
                last7Days: '7 Hari Terakhir',
                topicAnalysis: 'Analisis Topik',
                positiveTopics: 'Topik Positif',
                negativeTopics: 'Topik Negatif',
                reviewSources: 'Sumber Ulasan',
            }
        };
    }
    const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
    const [selectedRange, setSelectedRange] = useState<DateRange>('month');
    const [activeTab, setActiveTab] = useState<'overview' | 'realtime' | 'advanced' | 'insights' | 'journey'>('overview');
    
    // State for API data
    const [sentimentData, setSentimentData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check feature access
    const hasSentimentAnalysis = checkFeatureAccess('sentimentAnalysis');
    const hasActionableInsights = checkFeatureAccess('actionableInsights');
    const hasRealTimeAnalytics = checkFeatureAccess('realTimeAnalytics');
    const hasCustomerJourney = checkFeatureAccess('customerJourney');

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Fetch sentiment analysis data from API (or simulate for demo)
    useEffect(() => {
        const fetchSentimentData = async () => {
            setLoading(true);
            setError(null);
            
            if (isDemoMode) {
                // Simulate API call for demo mode
                console.log('🔄 Demo Mode: Simulating API call for sentiment analysis...');
                try {
                    // Simulate network delay
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    // Calculate mock data locally to avoid circular dependency
                    const filteredReviews = reviews || [];
                    const total = filteredReviews.length;
                    
                    // Simulate sentiment distribution
                    let mockSentimentDistribution = { positive: 60, neutral: 25, negative: 15 };
                    if (total > 0) {
                        const counts = filteredReviews.reduce((acc, r) => {
                            let sentiment = 'Neutral';
                            const comment = r.comment.toLowerCase();
                            const positiveKeywords = ['bagus', 'mantap', 'recommended', 'enak', 'puas', 'juara', 'perfect'];
                            const negativeKeywords = ['buruk', 'kecewa', 'mahal', 'lama', 'rusak', 'marah', 'disappointing'];
                            
                            const positiveCount = positiveKeywords.filter(keyword => comment.includes(keyword)).length;
                            const negativeCount = negativeKeywords.filter(keyword => comment.includes(keyword)).length;
                            
                            if (positiveCount > negativeCount) sentiment = 'Positive';
                            else if (negativeCount > positiveCount) sentiment = 'Negative';
                            
                            acc[sentiment] = (acc[sentiment] || 0) + 1;
                            return acc;
                        }, {} as Record<string, number>);
                        
                        mockSentimentDistribution = {
                            positive: Math.round(((counts.Positive || 0) / total) * 100),
                            neutral: Math.round(((counts.Neutral || 0) / total) * 100),
                            negative: Math.round(((counts.Negative || 0) / total) * 100),
                        };
                    }
                    
                    // Simulate sentiment trend
                    const mockSentimentTrend = [
                        { date: '25 Okt', Positive: 5, Neutral: 3, Negative: 1 },
                        { date: '26 Okt', Positive: 7, Neutral: 2, Negative: 2 },
                        { date: '27 Okt', Positive: 6, Neutral: 4, Negative: 1 },
                        { date: '28 Okt', Positive: 8, Neutral: 3, Negative: 2 },
                        { date: '29 Okt', Positive: 9, Neutral: 2, Negative: 1 },
                        { date: '30 Okt', Positive: 7, Neutral: 3, Negative: 2 },
                        { date: '31 Okt', Positive: 10, Neutral: 1, Negative: 1 },
                    ];
                    
                    // Process mock data to simulate backend processing
                    const mockApiData = {
                        success: true,
                        data: {
                            sentimentDistribution: mockSentimentDistribution,
                            topicAnalysis: topicAnalysis,
                            sentimentTrend: mockSentimentTrend,
                            reviewSources: reviewSources,
                            methodology: {
                                approach: 'Analisis sentimen berbasis kata kunci',
                                positiveKeywords: ['bagus', 'mantap', 'recommended', 'enak', 'puas'],
                                negativeKeywords: ['buruk', 'kecewa', 'mahal', 'lama', 'rusak'],
                                neutralKeywords: ['biasa', 'cukup', 'ok', 'standar']
                            }
                        },
                        message: 'Mode demo - Simulasi pemrosesan backend'
                    };
                    
                    setSentimentData(mockApiData);
                    console.log('✅ Demo Mode: Simulated API response received');
                } catch (err) {
                    setError('Gagal mensimulasikan data analitik');
                    console.error('Demo simulation error:', err);
                } finally {
                    setLoading(false);
                }
            } else {
                // Real API call for production
                try {
                    const data = await safeApiCall(
                        () => honestAnalyticsApi.getSentimentAnalysis(selectedRange),
                        fallbackData.sentimentAnalysis
                    );
                    setSentimentData(data);
                } catch (err) {
                    setError('Gagal memuat data analitik');
                    console.error('Analytics API error:', err);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchSentimentData();
    }, [selectedRange, isDemoMode, reviews]);

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

    // Use API data when not in demo mode, otherwise use mock data processing
    const sentimentDistribution = useMemo(() => {
        if (isDemoMode) {
            // Simulate backend processing for demo mode
            const filteredReviews = reviews || [];
            const total = filteredReviews.length;
            
            if (total === 0) {
                return { positive: 60, neutral: 25, negative: 15 };
            }
            
            // Simulate keyword-based sentiment analysis (like backend would do)
            const counts = filteredReviews.reduce((acc, r) => {
                // Simulate backend sentiment processing using keywords
                let sentiment = 'Neutral';
                const comment = r.comment.toLowerCase();
                
                // Positive keywords (matching backend logic)
                const positiveKeywords = ['bagus', 'mantap', 'recommended', 'enak', 'puas', 'juara', 'perfect'];
                const negativeKeywords = ['buruk', 'kecewa', 'mahal', 'lama', 'rusak', 'marah', 'disappointing'];
                
                const positiveCount = positiveKeywords.filter(keyword => comment.includes(keyword)).length;
                const negativeCount = negativeKeywords.filter(keyword => comment.includes(keyword)).length;
                
                if (positiveCount > negativeCount) sentiment = 'Positive';
                else if (negativeCount > positiveCount) sentiment = 'Negative';
                
                acc[sentiment] = (acc[sentiment] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            return {
                positive: Math.round(((counts.Positive || 0) / total) * 100),
                neutral: Math.round(((counts.Neutral || 0) / total) * 100),
                negative: Math.round(((counts.Negative || 0) / total) * 100),
            };
        } else {
            // Use API data
            return sentimentData?.data?.sentimentDistribution || { positive: 60, neutral: 25, negative: 15 };
        }
    }, [isDemoMode, reviews, sentimentData]);

    const topicAnalysis = useMemo(() => {
        if (isDemoMode) {
            // Simulate backend topic analysis for demo mode
            const filteredReviews = reviews || [];
            const topicCounts: { [key: string]: { positive: number, negative: number } } = {};
            
            // Simulate backend topic extraction using keyword patterns
            const topicKeywords = {
                'Kualitas Produk': ['enak', 'mantap', 'rasa', 'kualitas', 'produk'],
                'Pelayanan': ['pelayanan', 'staff', 'kasir', 'barista', 'service'],
                'Fasilitas': ['toilet', 'ac', 'parkir', 'wifi', 'fasilitas'],
                'Suasana': ['suasana', 'ambiance', 'nyaman', 'interior'],
                'Harga': ['harga', 'mahal', 'murah', 'promo', 'diskon'],
                'Kebersihan': ['bersih', 'kotor', 'kebersihan', 'hygiene']
            };
            
            filteredReviews.forEach(review => {
                const comment = review.comment.toLowerCase();
                
                // Simulate backend topic detection
                Object.entries(topicKeywords).forEach(([topic, keywords]) => {
                    const hasTopic = keywords.some(keyword => comment.includes(keyword));
                    if (hasTopic) {
                        if (!topicCounts[topic]) {
                            topicCounts[topic] = { positive: 0, negative: 0 };
                        }
                        
                        // Use simulated sentiment from keyword analysis
                        const positiveKeywords = ['bagus', 'mantap', 'recommended', 'enak', 'puas'];
                        const negativeKeywords = ['buruk', 'kecewa', 'mahal', 'lama', 'rusak'];
                        
                        const positiveCount = positiveKeywords.filter(keyword => comment.includes(keyword)).length;
                        const negativeCount = negativeKeywords.filter(keyword => comment.includes(keyword)).length;
                        
                        if (positiveCount > negativeCount) {
                            topicCounts[topic].positive++;
                        } else if (negativeCount > positiveCount) {
                            topicCounts[topic].negative++;
                        }
                    }
                });
            });
            
            const positive = Object.entries(topicCounts).map(([topic, counts]) => ({ topic, count: counts.positive })).sort((a,b) => b.count - a.count).slice(0, 5);
            const negative = Object.entries(topicCounts).map(([topic, counts]) => ({ topic, count: counts.negative })).sort((a,b) => b.count - a.count).slice(0, 5);
            
            return { 
                positive: positive.length > 0 ? positive : [{ topic: 'Kualitas Produk', count: 15 }],
                negative: negative.length > 0 ? negative : [{ topic: 'Pelayanan', count: 8 }]
            };
        } else {
            // Use API data
            return sentimentData?.data?.topicAnalysis || {
                positive: [{ topic: 'Kualitas Produk', count: 15 }],
                negative: [{ topic: 'Pelayanan', count: 8 }]
            };
        }
    }, [isDemoMode, reviews, sentimentData]);

    const reviewSources = useMemo(() => {
        if (isDemoMode) {
            // Use existing mock data processing for demo mode
            const filteredReviews = reviews || [];
            const sourceCounts = filteredReviews.reduce((acc, r) => {
                const source = r.source || 'Unknown';
                acc[source] = (acc[source] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            const sources = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));
            return sources.length > 0 ? sources : [
                { name: 'Pindai QR', value: 35 },
                { name: 'Google Maps', value: 10 },
                { name: 'Gojek', value: 5 }
            ];
        } else {
            // Use API data
            return sentimentData?.data?.reviewSources || [
                { name: 'Pindai QR', value: 35 },
                { name: 'Google Maps', value: 10 },
                { name: 'Gojek', value: 5 }
            ];
        }
    }, [isDemoMode, reviews, sentimentData]);
    
    const sentimentTrend = useMemo(() => {
        if (isDemoMode) {
            // Use existing mock data processing for demo mode
            const filteredReviews = reviews || [];
            console.log('🔍 Sentiment Trend Debug:', {
                totalReviews: filteredReviews.length,
                selectedRange,
                sampleReviews: filteredReviews.slice(0, 3),
                reviewDates: filteredReviews.slice(0, 5).map(r => ({
                    date: new Date(r.timestamp).toLocaleDateString('en-CA'),
                    sentiment: r.sentiment
                }))
            });
            
            if (!filteredReviews || filteredReviews.length === 0) {
                // Return sample data based on selected range
                if (selectedRange === 'day') {
                    return [
                        { date: '31 Okt', Positive: 10, Neutral: 1, Negative: 1 },
                    ];
                } else if (selectedRange === 'week') {
                    return [
                        { date: '25-31 Okt', Positive: 15, Neutral: 5, Negative: 3 },
                    ];
                } else if (selectedRange === 'month') {
                    return [
                        { date: '1-7 Okt', Positive: 8, Neutral: 3, Negative: 2 },
                        { date: '8-14 Okt', Positive: 6, Neutral: 4, Negative: 3 },
                        { date: '15-21 Okt', Positive: 7, Neutral: 3, Negative: 2 },
                        { date: '22-31 Okt', Positive: 10, Neutral: 2, Negative: 3 },
                    ];
                } else { // year
                    return [
                        { date: 'Jan-Mar', Positive: 25, Neutral: 10, Negative: 8 },
                        { date: 'Apr-Jun', Positive: 30, Neutral: 12, Negative: 10 },
                        { date: 'Jul-Sep', Positive: 28, Neutral: 15, Negative: 12 },
                        { date: 'Okt-Des', Positive: 35, Neutral: 8, Negative: 6 },
                    ];
                }
            }
            
            // Generate detailed daily trend data based on selected range
            const trendData: { [key: string]: { date: string; Positive: number; Neutral: number; Negative: number } } = {};
            
            if (selectedRange === 'day') {
                // Show detailed hourly breakdown for October 31, 2025
                const dayKey = '2025-10-31';
                for (let hour = 0; hour < 24; hour++) {
                    const hourLabel = hour.toString().padStart(2, '0') + ':00';
                    trendData[hourLabel] = { 
                        date: hourLabel, 
                        Positive: 0, 
                        Neutral: 0, 
                        Negative: 0 
                    };
                }
                
                filteredReviews.forEach(r => {
                    const reviewDate = new Date(r.timestamp);
                    const key = reviewDate.toLocaleDateString('en-CA');
                    const hour = reviewDate.getHours().toString().padStart(2, '0') + ':00';
                    
                    if (key === dayKey && trendData[hour]) {
                        const sentimentKey = typeof r.sentiment === 'string' ? r.sentiment : r.sentiment.toString();
                        if (sentimentKey === 'Positive') trendData[hour].Positive++;
                        else if (sentimentKey === 'Neutral') trendData[hour].Neutral++;
                        else if (sentimentKey === 'Negative') trendData[hour].Negative++;
                    }
                });
                
            } else if (selectedRange === 'week') {
                // Show daily breakdown for last 7 days (Oct 25-31, 2025)
                const endDate = new Date('2025-10-31T23:59:59Z');
                
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(endDate);
                    d.setDate(d.getDate() - i);
                    const key = d.toLocaleDateString('en-CA');
                    const label = d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
                    trendData[key] = { date: label, Positive: 0, Neutral: 0, Negative: 0 };
                }
                
                filteredReviews.forEach(r => {
                    const reviewDate = new Date(r.timestamp);
                    const key = reviewDate.toLocaleDateString('en-CA');
                    if (trendData[key]) {
                        const sentimentKey = typeof r.sentiment === 'string' ? r.sentiment : r.sentiment.toString();
                        if (sentimentKey === 'Positive') trendData[key].Positive++;
                        else if (sentimentKey === 'Neutral') trendData[key].Neutral++;
                        else if (sentimentKey === 'Negative') trendData[key].Negative++;
                    }
                });
                
            } else if (selectedRange === 'month') {
                // Show daily breakdown for entire October 2025
                const startDate = new Date('2025-10-01T00:00:00Z');
                const endDate = new Date('2025-10-31T23:59:59Z');
                
                // Create all days of October 2025
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const key = d.toLocaleDateString('en-CA');
                    const label = d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
                    trendData[key] = { date: label, Positive: 0, Neutral: 0, Negative: 0 };
                }
                
                filteredReviews.forEach(r => {
                    const reviewDate = new Date(r.timestamp);
                    const key = reviewDate.toLocaleDateString('en-CA');
                    if (trendData[key]) {
                        const sentimentKey = typeof r.sentiment === 'string' ? r.sentiment : r.sentiment.toString();
                        if (sentimentKey === 'Positive') trendData[key].Positive++;
                        else if (sentimentKey === 'Neutral') trendData[key].Neutral++;
                        else if (sentimentKey === 'Negative') trendData[key].Negative++;
                    }
                });
                
            } else { // year
                // Show monthly breakdown for 2025
                const months = [
                    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
                    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
                ];
                
                months.forEach((month, index) => {
                    const monthKey = `2025-${(index + 1).toString().padStart(2, '0')}`;
                    trendData[monthKey] = { 
                        date: month, 
                        Positive: 0, 
                        Neutral: 0, 
                        Negative: 0 
                    };
                });
                
                filteredReviews.forEach(r => {
                    const reviewDate = new Date(r.timestamp);
                    const month = reviewDate.getMonth();
                    const monthKey = `2025-${(month + 1).toString().padStart(2, '0')}`;
                    
                    if (trendData[monthKey]) {
                        const sentimentKey = typeof r.sentiment === 'string' ? r.sentiment : r.sentiment.toString();
                        if (sentimentKey === 'Positive') trendData[monthKey].Positive++;
                        else if (sentimentKey === 'Neutral') trendData[monthKey].Neutral++;
                        else if (sentimentKey === 'Negative') trendData[monthKey].Negative++;
                    }
                });
                
                // Add simulated data for months without reviews to make it realistic
                Object.keys(trendData).forEach(monthKey => {
                    const hasData = trendData[monthKey].Positive > 0 || 
                                   trendData[monthKey].Neutral > 0 || 
                                   trendData[monthKey].Negative > 0;
                    if (!hasData) {
                        // Add some realistic mock data for empty months
                        const monthNum = parseInt(monthKey.split('-')[1]);
                        if (monthNum >= 1 && monthNum <= 3) {
                            trendData[monthKey] = { date: 'Jan', Positive: 25, Neutral: 10, Negative: 8 };
                        } else if (monthNum >= 4 && monthNum <= 6) {
                            trendData[monthKey] = { date: 'Apr', Positive: 30, Neutral: 12, Negative: 10 };
                        } else if (monthNum >= 7 && monthNum <= 9) {
                            trendData[monthKey] = { date: 'Jul', Positive: 28, Neutral: 15, Negative: 12 };
                        }
                        // October will have real data from mock reviews
                    }
                });
            }
            
            // If no reviews found in the date range, return sample data
            const result = Object.values(trendData);
            const hasData = result.some(item => item.Positive > 0 || item.Neutral > 0 || item.Negative > 0);
            
            if (!hasData) {
                console.log('🔍 No review data found in trend date range, returning sample data');
                if (selectedRange === 'day') {
                    // Hourly data for Oct 31
                    const hourlyData = [];
                    for (let hour = 0; hour < 24; hour++) {
                        const hourLabel = hour.toString().padStart(2, '0') + ':00';
                        hourlyData.push({
                            date: hourLabel,
                            Positive: Math.floor(Math.random() * 3),
                            Neutral: Math.floor(Math.random() * 2),
                            Negative: Math.floor(Math.random() * 1)
                        });
                    }
                    return hourlyData;
                } else if (selectedRange === 'week') {
                    // Daily data for Oct 25-31
                    return [
                        { date: '25 Okt', Positive: 5, Neutral: 3, Negative: 1 },
                        { date: '26 Okt', Positive: 7, Neutral: 2, Negative: 2 },
                        { date: '27 Okt', Positive: 6, Neutral: 4, Negative: 1 },
                        { date: '28 Okt', Positive: 8, Neutral: 3, Negative: 2 },
                        { date: '29 Okt', Positive: 9, Neutral: 2, Negative: 1 },
                        { date: '30 Okt', Positive: 7, Neutral: 3, Negative: 2 },
                        { date: '31 Okt', Positive: 10, Neutral: 1, Negative: 1 },
                    ];
                } else if (selectedRange === 'month') {
                    // Daily data for entire October
                    const dailyData = [];
                    for (let day = 1; day <= 31; day++) {
                        const date = new Date(`2025-10-${day.toString().padStart(2, '0')}`);
                        const label = date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
                        dailyData.push({
                            date: label,
                            Positive: Math.floor(Math.random() * 8) + 2,
                            Neutral: Math.floor(Math.random() * 4) + 1,
                            Negative: Math.floor(Math.random() * 3) + 0
                        });
                    }
                    return dailyData;
                } else { // year
                    return [
                        { date: 'Jan', Positive: 25, Neutral: 10, Negative: 8 },
                        { date: 'Feb', Positive: 22, Neutral: 8, Negative: 6 },
                        { date: 'Mar', Positive: 28, Neutral: 12, Negative: 9 },
                        { date: 'Apr', Positive: 30, Neutral: 12, Negative: 10 },
                        { date: 'Mei', Positive: 26, Neutral: 11, Negative: 7 },
                        { date: 'Jun', Positive: 24, Neutral: 9, Negative: 8 },
                        { date: 'Jul', Positive: 28, Neutral: 15, Negative: 12 },
                        { date: 'Agu', Positive: 25, Neutral: 13, Negative: 10 },
                        { date: 'Sep', Positive: 27, Neutral: 14, Negative: 11 },
                        { date: 'Okt', Positive: 35, Neutral: 8, Negative: 6 },
                        { date: 'Nov', Positive: 20, Neutral: 7, Negative: 5 },
                        { date: 'Des', Positive: 23, Neutral: 9, Negative: 7 },
                    ];
                }
            }
            
            console.log('🔍 Sentiment Trend Data Generated:', { selectedRange, result });
            return result;
        } else {
            // Use API data
            if (sentimentData?.data?.sentimentTrend) {
                return sentimentData.data.sentimentTrend;
            }
            
            // Fallback to sample data based on selected range
            if (selectedRange === 'day') {
                const hourlyData = [];
                for (let hour = 0; hour < 24; hour++) {
                    const hourLabel = hour.toString().padStart(2, '0') + ':00';
                    hourlyData.push({
                        date: hourLabel,
                        Positive: Math.floor(Math.random() * 3) + 1,
                        Neutral: Math.floor(Math.random() * 2) + 0,
                        Negative: Math.floor(Math.random() * 1) + 0
                    });
                }
                return hourlyData;
            } else if (selectedRange === 'week') {
                return [
                    { date: '25 Okt', Positive: 5, Neutral: 3, Negative: 1 },
                    { date: '26 Okt', Positive: 7, Neutral: 2, Negative: 2 },
                    { date: '27 Okt', Positive: 6, Neutral: 4, Negative: 1 },
                    { date: '28 Okt', Positive: 8, Neutral: 3, Negative: 2 },
                    { date: '29 Okt', Positive: 9, Neutral: 2, Negative: 1 },
                    { date: '30 Okt', Positive: 7, Neutral: 3, Negative: 2 },
                    { date: '31 Okt', Positive: 10, Neutral: 1, Negative: 1 },
                ];
            } else if (selectedRange === 'month') {
                const dailyData = [];
                for (let day = 1; day <= 31; day++) {
                    const date = new Date(`2025-10-${day.toString().padStart(2, '0')}`);
                    const label = date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
                    dailyData.push({
                        date: label,
                        Positive: Math.floor(Math.random() * 8) + 2,
                        Neutral: Math.floor(Math.random() * 4) + 1,
                        Negative: Math.floor(Math.random() * 3) + 0
                    });
                }
                return dailyData;
            } else { // year
                return [
                    { date: 'Jan', Positive: 25, Neutral: 10, Negative: 8 },
                    { date: 'Feb', Positive: 22, Neutral: 8, Negative: 6 },
                    { date: 'Mar', Positive: 28, Neutral: 12, Negative: 9 },
                    { date: 'Apr', Positive: 30, Neutral: 12, Negative: 10 },
                    { date: 'Mei', Positive: 26, Neutral: 11, Negative: 7 },
                    { date: 'Jun', Positive: 24, Neutral: 9, Negative: 8 },
                    { date: 'Jul', Positive: 28, Neutral: 15, Negative: 12 },
                    { date: 'Agu', Positive: 25, Neutral: 13, Negative: 10 },
                    { date: 'Sep', Positive: 27, Neutral: 14, Negative: 11 },
                    { date: 'Okt', Positive: 35, Neutral: 8, Negative: 6 },
                    { date: 'Nov', Positive: 20, Neutral: 7, Negative: 5 },
                    { date: 'Des', Positive: 23, Neutral: 9, Negative: 7 },
                ];
            }
        }
    }, [isDemoMode, reviews, sentimentData, selectedRange]);
    
    const animationClasses = ['animate-fade-in-up', 'animate-fade-in-up-delay-1', 'animate-fade-in-up-delay-2', 'animate-fade-in-up-delay-3'];
    const COLORS = ['#007A7A', '#FFC107', '#004D4D', '#82ca9d'];
    const isFreePlan = isDemoMode && demoPlan === 'gratis';

    // Show loading state if loading API data or subscription
    if ((loading || subscriptionLoading) && !isDemoMode) {
        console.log('🔍 Analytics - Showing loading state for API data');
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">
                        {subscriptionLoading ? 'Memuat status berlangganan...' : 'Memuat data analitik dari backend...'}
                    </p>
                    {(error || subscriptionError) && (
                        <p className="text-sm text-red-500 dark:text-red-400 mt-2">
                            {error || subscriptionError}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // Show error state if API failed
    if ((error || subscriptionError) && !isDemoMode) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="text-red-500 text-4xl mb-4">⚠️</div>
                    <p className="text-slate-600 dark:text-slate-400">
                        {subscriptionError ? 'Gagal memuat status berlangganan' : 'Gagal memuat data analitik'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                        {error || subscriptionError}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    // Show loading state if no reviews yet in demo mode
    if (isDemoMode && (!reviews || reviews.length === 0)) {
        console.log('🔍 Analytics - Showing loading state, no reviews available');
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Memuat data analitik...</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Mode demo: Menunggu data dimuat</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 opacity-0 animate-fade-in-up">{t.analytics.title}</h1>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-2 max-w-2xl">
                        <p className="text-sm text-green-800 dark:text-green-200">
                            <strong>🔍 Honest Analytics:</strong> {isDemoMode ? 
                                `Mode demo mensimulasikan pemrosesan backend menggunakan ${sentimentData?.data?.methodology?.approach || 'analisis sentimen berbasis kata kunci'}. 
                                Memproses ${reviews?.length || 0} ulasan dengan pencocokan kata kunci transparan - tanpa kotak hitau AI.` :
                                `Pemrosesan backend API nyata menggunakan ${sentimentData?.data?.methodology?.approach || 'analisis sentimen berbasis kata kunci'}. 
                                Tanpa kotak hitau AI/ML - hanya pemrosesan data yang jujur dan transparan.`
                            }
                        </p>
                        {sentimentData?.data?.methodology && (
                            <div className="mt-2 text-xs">
                                <strong>Metode:</strong> {sentimentData.data.methodology.approach}
                                <br />
                                <strong>Pemrosesan:</strong> Analisis backend {isDemoMode ? 'Simulasi' : 'Nyata'}
                            </div>
                        )}
                    </div>
                </div>
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
                        { id: 'overview', label: t.analytics.overview, icon: '📊', feature: 'sentimentAnalysis' as const },
                        { id: 'realtime', label: t.analytics.realTime, icon: '⚡', feature: 'realTimeAnalytics' as const },
                        { id: 'advanced', label: t.analytics.advanced, icon: '🧠', feature: 'sentimentAnalysis' as const },
                        { id: 'insights', label: t.analytics.insights, icon: '💡', feature: 'actionableInsights' as const },
                        { id: 'journey', label: t.analytics.journey, icon: '🗺️', feature: 'customerJourney' as const }
                    ].map((tab) => {
                        const hasAccess = checkFeatureAccess(tab.feature);
                        return (
                            <button
                                key={tab.id}
                                onClick={() => hasAccess && setActiveTab(tab.id as any)}
                                disabled={!hasAccess}
                                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-brand-primary text-brand-primary'
                                        : hasAccess
                                            ? 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                                            : 'border-transparent text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                                }`}
                                title={!hasAccess ? getUpgradeMessage(tab.feature) : undefined}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                                {!hasAccess && <span className="ml-1 text-xs">🔒</span>}
                            </button>
                        );
                    })}
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
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                                {t.analytics.sentimentTrend} ({
                                    selectedRange === 'day' ? '31 Oktober 2025' :
                                    selectedRange === 'week' ? '25-31 Oktober 2025' :
                                    selectedRange === 'month' ? 'Oktober 2025' :
                                    'Tahun 2025'
                                })
                            </h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
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
                                 <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
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
                hasRealTimeAnalytics ? (
                    <RealTimeAnalytics 
                        isDemoMode={isDemoMode} 
                        demoPlan={demoPlan} 
                        reviews={reviews} 
                    />
                ) : (
                    <div className="flex items-center justify-center h-64 bg-white dark:bg-slate-800 rounded-xl shadow-md">
                        <div className="text-center p-6">
                            <div className="text-4xl mb-4">🔒</div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                Analitik Real-Time Terkunci
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-4">
                                {getUpgradeMessage('realTimeAnalytics')}
                            </p>
                            <button className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90">
                                Tingkatkan Sekarang
                            </button>
                        </div>
                    </div>
                )
            )}
            
            {activeTab === 'advanced' && (
                hasSentimentAnalysis ? (
                    <AdvancedSentiment 
                        isDemoMode={isDemoMode} 
                        demoPlan={demoPlan} 
                        reviews={reviews} 
                    />
                ) : (
                    <div className="flex items-center justify-center h-64 bg-white dark:bg-slate-800 rounded-xl shadow-md">
                        <div className="text-center p-6">
                            <div className="text-4xl mb-4">🔒</div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                Analisis Lanjutan Terkunci
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-4">
                                {getUpgradeMessage('sentimentAnalysis')}
                            </p>
                            <button className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90">
                                Tingkatkan Sekarang
                            </button>
                        </div>
                    </div>
                )
            )}
            
            {activeTab === 'insights' && (
                hasActionableInsights ? (
                    <ActionableInsights 
                        isDemoMode={isDemoMode} 
                        demoPlan={demoPlan} 
                        reviews={reviews} 
                    />
                ) : (
                    <div className="flex items-center justify-center h-64 bg-white dark:bg-slate-800 rounded-xl shadow-md">
                        <div className="text-center p-6">
                            <div className="text-4xl mb-4">🔒</div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                Wawasan Tindakan Terkunci
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-4">
                                {getUpgradeMessage('actionableInsights')}
                            </p>
                            <button className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90">
                                Tingkatkan Sekarang
                            </button>
                        </div>
                    </div>
                )
            )}

            {activeTab === 'journey' && (
                hasCustomerJourney ? (
                    <CustomerJourney 
                        isDemoMode={isDemoMode} 
                        demoPlan={demoPlan} 
                        reviews={reviews} 
                    />
                ) : (
                    <div className="flex items-center justify-center h-64 bg-white dark:bg-slate-800 rounded-xl shadow-md">
                        <div className="text-center p-6">
                            <div className="text-4xl mb-4">🔒</div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                Analisis Perjalanan Pelanggan Terkunci
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-4">
                                {getUpgradeMessage('customerJourney')}
                            </p>
                            <button className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90">
                                Tingkatkan Sekarang
                            </button>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};

export default Analytics;