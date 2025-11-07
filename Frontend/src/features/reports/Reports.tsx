import React, { useState, useMemo } from 'react';
import type { Questionnaire, DemoPlan, Review } from '../../types';
// Temporary inline icon to fix import issues
const ArrowRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
);
import ReportDetailView from './ReportDetailView';

const ReportList: React.FC<{ 
    questionnaires: Questionnaire[]; 
    isDemoMode: boolean; 
    demoPlan: DemoPlan;
    onViewReport: (questionnaire: Questionnaire) => void;
}> = ({ questionnaires, isDemoMode, demoPlan, onViewReport }) => {
    
    const isFeatureDisabled = isDemoMode && (demoPlan === 'free' || demoPlan === 'starter');

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Laporan & Data Mentah</h1>
            <p className="text-slate-600 dark:text-slate-400">Pilih kuesioner di bawah ini untuk melihat semua data masukan individual atau untuk mengunduh data mentah dalam format CSV.</p>
            
            {isFeatureDisabled && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/40 p-4 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                    <b>Fitur Lanjutan:</b> Melihat dan mengunduh data mentah tersedia di paket <b>BUSINESS</b>. Tingkatkan paket Anda untuk mengakses fitur ini.
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-slate-700/50">
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {questionnaires.map(q => (
                        <li key={q.id} className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-100">{q.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{q.responseCount} Responden</p>
                            </div>
                            <button 
                                onClick={() => onViewReport(q)}
                                disabled={isFeatureDisabled}
                                title={isFeatureDisabled ? "Tersedia di paket BUSINESS" : "Lihat Laporan Detail"}
                                className="flex items-center text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Lihat Laporan
                                <ArrowRightIcon className="w-4 h-4 ml-2"/>
                            </button>
                        </li>
                    ))}
                     {questionnaires.length === 0 && (
                        <li className="p-8 text-center text-sm text-slate-500">
                            Belum ada kuesioner yang dibuat untuk ditampilkan laporannya.
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};


const Reports: React.FC<{ 
    questionnaires: Questionnaire[]; 
    reviews: Review[];
    isDemoMode: boolean; 
    demoPlan: DemoPlan; 
}> = ({ questionnaires, reviews, isDemoMode, demoPlan }) => {
    
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);

    const handleViewReport = (questionnaire: Questionnaire) => {
        setSelectedQuestionnaire(questionnaire);
        setView('detail');
    };

    const handleCloseDetail = () => {
        setSelectedQuestionnaire(null);
        setView('list');
    };
    
    const relevantReviews = useMemo(() => {
        if (!selectedQuestionnaire) return [];
        return reviews.filter(r => r.questionnaireId === selectedQuestionnaire.id);
    }, [reviews, selectedQuestionnaire]);


    if (view === 'detail' && selectedQuestionnaire) {
        return (
            <ReportDetailView 
                questionnaire={selectedQuestionnaire}
                reviews={relevantReviews}
                onClose={handleCloseDetail}
            />
        );
    }
    
    return (
        <ReportList 
            questionnaires={questionnaires}
            isDemoMode={isDemoMode}
            demoPlan={demoPlan}
            onViewReport={handleViewReport}
        />
    );
};

export default Reports;