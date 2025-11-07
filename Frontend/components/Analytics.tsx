import React, { useMemo, useState, useEffect } from 'react';
import type { Review, DemoPlan } from '../types';
import { Sentiment } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { LockIcon } from './common/Icons';

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
    const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

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

    const sentimentDistribution = useMemo(() => {
        const total = reviews.length;
        if (total === 0) return { positive: 0, neutral: 0, negative: 0 };
        const counts = reviews.reduce((acc, r) => {
            acc[r.sentiment] = (acc[r.sentiment] || 0) + 1;
            return acc;
        }, {} as Record<Sentiment, number>);
        return {
            positive: Math.round(((counts.Positive || 0) / total) * 100),
            neutral: Math.round(((counts.Neutral || 0) / total) * 100),
            negative: Math.round(((counts.Negative || 0) / total) * 100),
        };
    }, [reviews]);
    
    const topicAnalysis = useMemo(() => {
        const topicCounts: { [key: string]: { positive: number, negative: number } } = {};
        reviews.forEach(review => {
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
        const positive = Object.entries(topicCounts).map(([topic, counts]) => ({ topic, count: counts.positive })).sort((a,b) => b.count - a.count).slice(0, 5);
        const negative = Object.entries(topicCounts).map(([topic, counts]) => ({ topic, count: counts.negative })).sort((a,b) => b.count - a.count).slice(0, 5);
        return { positive, negative };
    }, [reviews]);

    const reviewSources = useMemo(() => {
        const sourceCounts = reviews.reduce((acc, r) => {
            acc[r.source] = (acc[r.source] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));
    }, [reviews]);
    
     const sentimentTrend = useMemo(() => {
        const trendData: { [key: string]: { date: string; Positive: number; Neutral: number; Negative: number } } = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            trendData[key] = { date: label, Positive: 0, Neutral: 0, Negative: 0 };
        }
        reviews.forEach(r => {
            const key = r.timestamp.toLocaleDateString('en-CA');
            if (trendData[key]) {
                trendData[key][r.sentiment]++;
            }
        });
        return Object.values(trendData);
    }, [reviews]);
    
    const animationClasses = ['animate-fade-in-up', 'animate-fade-in-up-delay-1', 'animate-fade-in-up-delay-2', 'animate-fade-in-up-delay-3'];
    const COLORS = ['#007A7A', '#FFC107', '#004D4D', '#82ca9d'];
    const isFreePlan = isDemoMode && demoPlan === 'free';


    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 opacity-0 animate-fade-in-up">Analytics</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Distribusi Sentimen" className={animationClasses[0]}>
                    <div className="flex justify-around items-center h-full">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-green-500">{sentimentDistribution.positive}%</p>
                            <p className="text-xs text-slate-500">Positif</p>
                        </div>
                         <div className="text-center">
                            <p className="text-3xl font-bold text-yellow-500">{sentimentDistribution.neutral}%</p>
                            <p className="text-xs text-slate-500">Netral</p>
                        </div>
                         <div className="text-center">
                            <p className="text-3xl font-bold text-red-500">{sentimentDistribution.negative}%</p>
                            <p className="text-xs text-slate-500">Negatif</p>
                        </div>
                    </div>
                </StatCard>
                <StatCard title="Topik Positif Teratas" className={animationClasses[1]}>
                    <div className="flex flex-col justify-center h-full">
                        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{topicAnalysis.positive[0]?.topic || '-'}</p>
                        <p className="text-xs text-slate-500">Paling sering dipuji oleh pelanggan.</p>
                    </div>
                </StatCard>
                 <StatCard title="Topik Negatif Teratas" className={animationClasses[2]}>
                    <div className="flex flex-col justify-center h-full">
                         <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{topicAnalysis.negative[0]?.topic || '-'}</p>
                        <p className="text-xs text-slate-500">Membutuhkan perhatian paling banyak.</p>
                    </div>
                </StatCard>
            </div>
            
            <div className="relative">
                {isFreePlan && <UpgradeOverlay text="Tingkatkan ke STARTER untuk melihat tren sentimen." />}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50 opacity-0 animate-fade-in-up-delay-2">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Tren Sentimen (7 Hari Terakhir)</h3>
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
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Analisis Topik</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400">Topik Positif</h4>
                            <div className="space-y-3">
                               {topicAnalysis.positive.map(t => (
                                   <TopicBar key={t.topic} topic={t.topic} count={t.count} maxCount={topicAnalysis.positive[0]?.count || 1} color="green" />
                               ))}
                            </div>
                        </div>
                         <div>
                            <h4 className="font-semibold mb-3 text-red-600 dark:text-red-400">Topik Negatif</h4>
                            <div className="space-y-3">
                               {topicAnalysis.negative.map(t => (
                                   <TopicBar key={t.topic} topic={t.topic} count={t.count} maxCount={topicAnalysis.negative[0]?.count || 1} color="red" />
                               ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50 opacity-0 animate-fade-in-up-delay-3">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Sumber Ulasan</h3>
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

        </div>
    );
};

export default Analytics;