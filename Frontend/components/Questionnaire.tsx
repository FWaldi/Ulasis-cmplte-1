import React, { useState } from 'react';
import type { Questionnaire, DemoPlan, Review } from '../types';
import { PlusIcon, PencilIcon, ReportsIcon, TrashIcon, ClipboardIcon } from './common/Icons';
import QuestionnaireBuilder from './QuestionnaireBuilder';
import QuestionnaireResults from './QuestionnaireResults';

const QuestionnaireCard: React.FC<{ 
    questionnaire: Questionnaire;
    onEdit: (q: Questionnaire) => void;
    onViewResults: (q: Questionnaire) => void;
    onDelete: (id: number, name: string) => void;
}> = ({ questionnaire, onEdit, onViewResults, onDelete }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md dark:shadow-slate-700/50 transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col">
        <div className="flex justify-between items-start">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex-1 mr-2">{questionnaire.name}</h3>
             <button onClick={() => onDelete(questionnaire.id, questionnaire.name)} className="p-1 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 flex-shrink-0">
                <TrashIcon className="w-4 h-4"/>
            </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{questionnaire.questions.length} Pertanyaan</p>
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-sm flex-1">
             <div className="flex justify-between">
                <p className="text-slate-600 dark:text-slate-400 text-xs">Total Responden:</p>
                <p className="font-semibold text-slate-700 dark:text-slate-200">{questionnaire.responseCount}</p>
             </div>
             <div className="flex justify-between mt-1">
                <p className="text-slate-600 dark:text-slate-400 text-xs">Terakhir Diedit:</p>
                <p className="font-semibold text-slate-700 dark:text-slate-200">{questionnaire.lastModified.toLocaleDateString()}</p>
             </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex space-x-2">
            <button onClick={() => onViewResults(questionnaire)} className="w-full flex items-center justify-center text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-md transition-colors">
                <ReportsIcon className="w-4 h-4 mr-2" /> Lihat Hasil
            </button>
            <button onClick={() => onEdit(questionnaire)} className="w-full flex items-center justify-center text-xs font-semibold bg-brand-primary hover:bg-brand-secondary text-white px-3 py-2 rounded-md transition-colors">
                 <PencilIcon className="w-4 h-4 mr-2" /> Edit
            </button>
        </div>
    </div>
);


const QuestionnaireList: React.FC<{ 
    questionnaires: Questionnaire[];
    isDemoMode: boolean;
    demoPlan: DemoPlan;
    onEdit: (q?: Questionnaire) => void;
    onViewResults: (q: Questionnaire) => void;
    onDelete: (id: number, name: string) => void;
}> = ({ questionnaires, isDemoMode, demoPlan, onEdit, onViewResults, onDelete }) => {
    const isAddDisabled = isDemoMode && demoPlan === 'gratis' && questionnaires.length >= 1;
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Kuesioner</h1>
                <button 
                    onClick={() => onEdit()} 
                    disabled={isAddDisabled}
                    title={isAddDisabled ? 'Paket Gratis hanya mendukung 1 kuesioner aktif.' : 'Buat Kuesioner Baru'}
                    className="flex items-center w-full sm:w-auto justify-center px-4 py-2 text-sm font-semibold bg-brand-primary hover:bg-brand-secondary text-white rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Buat Kuesioner Baru
                </button>
            </div>
            
            {isAddDisabled && (
                 <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                    Anda telah mencapai batas <b>1 kuesioner</b> untuk paket <b>GRATIS</b>. Hapus kuesioner yang ada untuk membuat yang baru, atau tingkatkan paket Anda.
                </div>
            )}

            {questionnaires.length > 0 ? (
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
}


interface QuestionnairesPageProps {
    questionnaires: Questionnaire[];
    reviews: Review[];
    isDemoMode: boolean;
    demoPlan: DemoPlan;
    onSave: (questionnaire: Omit<Questionnaire, 'id' | 'responseCount' | 'lastModified'> & { id?: number }) => void;
    onDelete: (id: number) => void;
}


const QuestionnairesPage: React.FC<QuestionnairesPageProps> = ({ questionnaires, reviews, isDemoMode, demoPlan, onSave, onDelete }) => {
    const [view, setView] = useState<'list' | 'builder' | 'results'>('list');
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | undefined>(undefined);

    const handleEdit = (questionnaire?: Questionnaire) => {
        setSelectedQuestionnaire(questionnaire);
        setView('builder');
    };

    const handleViewResults = (questionnaire: Questionnaire) => {
        setSelectedQuestionnaire(questionnaire);
        setView('results');
    };
    
    const handleDeleteWithConfirmation = (id: number, name: string) => {
        if(window.confirm(`Apakah Anda yakin ingin menghapus kuesioner "${name}"?`)) {
            onDelete(id);
        }
    };

    const handleSaveAndClose = (data: Omit<Questionnaire, 'id' | 'responseCount' | 'lastModified'> & { id?: number }) => {
        onSave(data);
        setView('list');
    };

    const handleCloseBuilder = () => {
        setSelectedQuestionnaire(undefined);
        setView('list');
    };

    switch (view) {
        case 'builder':
            return <QuestionnaireBuilder questionnaire={selectedQuestionnaire} onClose={handleCloseBuilder} onSave={handleSaveAndClose} />;
        case 'results':
            return <QuestionnaireResults questionnaire={selectedQuestionnaire!} reviews={reviews} onClose={handleCloseBuilder} />;
        case 'list':
        default:
            return <QuestionnaireList questionnaires={questionnaires} isDemoMode={isDemoMode} demoPlan={demoPlan} onEdit={handleEdit} onViewResults={handleViewResults} onDelete={handleDeleteWithConfirmation}/>;
    }
};

export default QuestionnairesPage;