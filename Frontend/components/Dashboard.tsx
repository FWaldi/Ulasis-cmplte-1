import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { TrendData, Page } from '../types';
import { PlusIcon, LightBulbIcon, CloseIcon } from './common/Icons';

interface KPI {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    change?: string;
    changeType?: 'increase' | 'decrease';
}

const KPICard: React.FC<{ kpi: KPI, animationClass: string, onClick?: () => void }> = ({ kpi, animationClass, onClick }) => (
    <button 
        onClick={onClick}
        disabled={!onClick}
        className={`w-full text-left bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50 transition-all hover:shadow-lg hover:-translate-y-1 opacity-0 ${animationClass} ${onClick ? 'cursor-pointer' : ''}`}>
        <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{kpi.title}</p>
            <div className="text-brand-primary">{kpi.icon}</div>
        </div>
        <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{kpi.value}</p>
            {kpi.change && (
                <span className={`ml-2 text-sm font-semibold ${kpi.changeType === 'increase' ? 'text-green-500' : 'text-red-500'}`}>
                    {kpi.change}
                </span>
            )}
        </div>
    </button>
);

interface DashboardProps {
  kpiData: { avgRating: number; totalReviews: number; responseRate: number; };
  trendData: TrendData[];
  onGenerateData: () => void;
  setActivePage: (page: Page) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ kpiData, trendData, onGenerateData, setActivePage }) => {
  const [showGuidance, setShowGuidance] = useState(true);
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
      labelStyle: { color: isDarkMode ? '#f1f5f9' : '#1e293b' }
  };
  
  const kpis: (KPI & { pageLink?: Page })[] = [
    { title: 'Average Rating', value: kpiData.avgRating, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.522 4.646a1 1 0 00.95.69h4.904c.969 0 1.371 1.24.588 1.81l-3.968 2.88a1 1 0 00-.364 1.118l1.522 4.646c.3.921-.755 1.688-1.539 1.118l-3.968-2.88a1 1 0 00-1.175 0l-3.968 2.88c-.784.57-1.838-.197-1.539-1.118l1.522-4.646a1 1 0 00-.364-1.118L2.08 9.073c-.783-.57-.38-1.81.588-1.81h4.904a1 1 0 00.95-.69L11.049 2.927z" /></svg>, change: '+0.1', changeType: 'increase', pageLink: 'analytics' },
    { title: 'Total Reviews', value: kpiData.totalReviews, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V7a2 2 0 012-2h4M5 8h2" /></svg>, change: '+52', changeType: 'increase', pageLink: 'inbox' },
    { title: 'Response Rate', value: `${kpiData.responseRate}%`, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 4h10a8 8 0 008 8v2" /></svg>, change: '-1.2%', changeType: 'decrease', pageLink: 'analytics' },
  ];
  const animationClasses = ['animate-fade-in-up', 'animate-fade-in-up-delay-1', 'animate-fade-in-up-delay-2', 'animate-fade-in-up-delay-3'];

  return (
    <div className="space-y-8">
       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 opacity-0 animate-fade-in-up">Dashboard</h1>
        <button 
          onClick={onGenerateData} 
          className="flex items-center text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-md transition-colors opacity-0 animate-fade-in-up-delay-1"
        >
            <PlusIcon className="w-4 h-4 mr-2" />
            Simulasikan Data Masuk
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {kpis.map((kpi, index) => <KPICard key={kpi.title} kpi={kpi} animationClass={animationClasses[index]} onClick={kpi.pageLink ? () => setActivePage(kpi.pageLink) : undefined} />)}
      </div>

      {showGuidance && (
        <div className="relative bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700/50 p-6 rounded-xl shadow-md text-slate-700 dark:text-slate-300 opacity-0 animate-fade-in-up-delay-2">
          <button
            onClick={() => setShowGuidance(false)}
            className="absolute top-3 right-3 p-1 rounded-full text-teal-600 dark:text-teal-400 hover:bg-teal-200/50 dark:hover:bg-teal-800/50"
            aria-label="Tutup panduan"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <LightBulbIcon className="w-8 h-8 text-teal-500 dark:text-teal-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Panduan: Membuat Kuesioner yang Efektif</h3>
              <p className="text-sm mb-4">
                Dapatkan ulasan berkualitas dengan merancang pertanyaan yang tepat. Berikut beberapa tips:
              </p>
              <ul className="space-y-3 text-sm list-disc list-inside">
                <li>
                  <b>Mulai dengan Tujuan Jelas:</b> Fokus pada satu topik per kuesioner (contoh: kebersihan, kecepatan layanan).
                </li>
                <li>
                  <b>Singkat & Spesifik:</b> Hindari pertanyaan ganda. Alih-alih "Bagaimana rasa makanan dan kecepatan layanan?", pecah menjadi dua pertanyaan terpisah.
                </li>
                <li>
                  <b>Gunakan Tipe yang Tepat:</b> Pakai <b>Rating</b> untuk kepuasan, <b>Pilihan Ganda</b> untuk opsi terbatas, dan <b>Jawaban Terbuka</b> untuk detail.
                </li>
                 <li>
                  <b>Jaga Agar Tetap Ringkas:</b> Idealnya, 3-5 pertanyaan. Hargai waktu pelanggan Anda agar mereka mau mengisi sampai selesai.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50 opacity-0 animate-fade-in-up-delay-2">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Evolusi Skor Rata-Rata</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007A7A" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#007A7A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(200, 200, 200, 0.2)" />
                <XAxis dataKey="date" tick={{fontSize: 12, fill: tickColor}} />
                <YAxis domain={[3.5, 5]} tick={{fontSize: 12, fill: tickColor}}/>
                <Tooltip 
                  contentStyle={tooltipStyle.contentStyle}
                  labelStyle={tooltipStyle.labelStyle}
                />
                <Area type="monotone" dataKey="Average Rating" stroke="#004D4D" fillOpacity={1} fill="url(#colorRating)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;