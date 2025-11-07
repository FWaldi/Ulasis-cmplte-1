import React from 'react';
import type { Questionnaire } from '../../types';
// Temporary inline icons to fix import issues
const PencilIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
);

const ReportsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v7m3-2h6" /></svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);

interface QuestionnaireCardProps {
    questionnaire: Questionnaire;
    onEdit: (q: Questionnaire) => void;
    onViewResults: (q: Questionnaire) => void;
    onDelete: (id: number, name: string) => void;
}

const QuestionnaireCard: React.FC<QuestionnaireCardProps> = ({
    questionnaire, onEdit, onViewResults, onDelete
}) => (
    <div data-testid="questionnaire-card" className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md dark:shadow-slate-700/50 transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col">
        <div className="flex justify-between items-start">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex-1 mr-2">{questionnaire.name}</h3>
             <button onClick={() => onDelete(questionnaire.id, questionnaire.name)} data-testid="delete-questionnaire" className="p-1 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 flex-shrink-0">
                 <TrashIcon className="w-4 h-4"/>
             </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{questionnaire.questions?.length || 0} Pertanyaan</p>
        
        {/* Questions Preview */}
        {questionnaire.questions && questionnaire.questions.length > 0 && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Preview Pertanyaan:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                    {questionnaire.questions.slice(0, 3).map((question, index) => (
                        <div key={question.id || index} className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {index + 1}. {question.text || question.questionText}
                        </div>
                    ))}
                    {questionnaire.questions.length > 3 && (
                        <div className="text-xs text-slate-500 italic">
                            ... dan {questionnaire.questions.length - 3} pertanyaan lainnya
                        </div>
                    )}
                </div>
            </div>
        )}
        
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

export default QuestionnaireCard;