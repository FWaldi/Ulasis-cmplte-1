import React from 'react';
import type { Questionnaire, DemoPlan } from '../../types';
// Temporary inline icons to fix import issues
const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
);

const ClipboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
);
import QuestionnaireCard from './QuestionnaireCard';

interface QuestionnaireListProps {
    questionnaires: Questionnaire[];
    isDemoMode: boolean;
    demoPlan: DemoPlan;
    usage?: { used: number; limit: number; plan: string };
    isLoading?: boolean;
    onEdit: (q?: Questionnaire) => void;
    onViewResults: (q: Questionnaire) => void;
    onDelete: (id: number, name: string) => void;
}

const QuestionnaireList: React.FC<QuestionnaireListProps> = ({
    questionnaires, isDemoMode, demoPlan, usage, isLoading, onEdit, onViewResults, onDelete
}) => {
    console.log('📋 QuestionnaireList render - questionnaires:', questionnaires.length, 'isDemoMode:', isDemoMode, 'isLoading:', isLoading);
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Kuesioner</h1>
                <button
                    onClick={() => onEdit()}
                    title="Buat Kuesioner Baru"
                    className="flex items-center w-full sm:w-auto justify-center px-4 py-2 text-sm font-semibold bg-brand-primary hover:bg-brand-secondary text-white rounded-lg shadow-md transition-all"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Buat Kuesioner Baru
                </button>
            </div>

            {usage && usage.used >= usage.limit && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                     {isDemoMode
                         ? `Anda telah mencapai batas 1 kuesioner untuk paket GRATIS. Hapus kuesioner yang ada untuk membuat yang baru, atau tingkatkan paket Anda.`
                         : `Anda telah mencapai batas ${usage.limit} kuesioner untuk paket ${usage.plan.toUpperCase()}. Hapus kuesioner yang ada untuk membuat yang baru, atau tingkatkan paket Anda.`
                     }
                 </div>
            )}

            {isLoading ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Memuat kuesioner...</p>
                </div>
            ) : questionnaires.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {questionnaires.map(q => <QuestionnaireCard key={q.id} questionnaire={q} onEdit={onEdit} onViewResults={onViewResults} onDelete={onDelete}/>)}
                </div>
            ) : (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <ClipboardIcon className="w-12 h-12 mx-auto text-slate-400" />
                    <h3 className="mt-4 font-semibold text-slate-700 dark:text-slate-300">Belum Ada Kuesioner</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Klik 'Buat Kuesioner Baru' untuk memulai.</p>
                </div>
            )}
        </div>
    );
};

export default QuestionnaireList;