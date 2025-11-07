import React from 'react';

export interface KPI {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    change?: string;
    changeType?: 'increase' | 'decrease';
}

interface KPICardProps {
    kpi: KPI;
    animationClass: string;
    onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ kpi, animationClass, onClick }) => (
    <button
        onClick={onClick}
        disabled={!onClick}
        className={`w-full text-left bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50 transition-all hover:shadow-lg hover:-translate-y-1 ${animationClass} ${onClick ? 'cursor-pointer' : ''}`}>
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

export default KPICard;