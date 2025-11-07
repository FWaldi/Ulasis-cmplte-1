import React, { useState } from 'react';
import type { Questionnaire, Question } from '../../types';
// Temporary inline icons to fix import issues
const StarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
);

const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);

interface QuestionnaireFormProps {
    questionnaire: Questionnaire;
    onSubmit: (answers: any) => void;
    isLoading?: boolean;
}

const renderQuestion = (question: Question, answer: any, setAnswer: (questionId: string, value: any) => void) => {
    // Ensure question has a valid ID, fallback to index if not
    const questionId = question.id || `question-${question.orderIndex || 0}`;
    
    switch(question.type) {
        case 'rating_5':
            return (
                <div className="flex items-center space-x-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <button key={i} type="button" onClick={() => setAnswer(questionId, i + 1)}>
                            <StarIcon className={`h-8 w-8 cursor-pointer transition-colors ${ (answer || 0) >= i + 1 ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600 hover:text-yellow-300'}`} filled={(answer || 0) >= i + 1} />
                        </button>
                    ))}
                </div>
            );
        case 'rating_10':
            return (
                <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setAnswer(questionId, i + 1)}
                            className={`w-10 h-10 rounded-full border transition-colors flex items-center justify-center font-bold ${ answer === i + 1 ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            );
        case 'yes_no':
             return (
                <div className="flex space-x-4">
                    <button type="button" onClick={() => setAnswer(questionId, 'yes')} className={`px-6 py-2 rounded-lg font-semibold transition-colors flex items-center ${ answer === 'yes' ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200'}`}>
                        {answer === 'yes' && <CheckIcon className="w-5 h-5 mr-2" />} Ya
                    </button>
                    <button type="button" onClick={() => setAnswer(questionId, 'no')} className={`px-6 py-2 rounded-lg font-semibold transition-colors flex items-center ${ answer === 'no' ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200'}`}>
                         {answer === 'no' && <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>} Tidak
                    </button>
                </div>
            );
        case 'short_text':
            return (
                <input
                    type="text"
                    value={answer || ''}
                    onChange={(e) => setAnswer(questionId, e.target.value)}
                    placeholder="Ketik jawaban Anda..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
            );
        case 'long_text':
             return (
                <textarea
                    value={answer || ''}
                    onChange={(e) => setAnswer(questionId, e.target.value)}
                    rows={4}
                    placeholder="Ketik jawaban Anda..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
            );
        case 'multiple_choice':
             return (
                <div className="space-y-2">
                    {(question.options || []).map(option => (
                        <label key={option} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
                            <input
                                type="radio"
                                name={questionId}
                                value={option}
                                checked={answer === option}
                                onChange={(e) => setAnswer(questionId, e.target.value)}
                                className="h-4 w-4 text-brand-primary border-slate-300 focus:ring-brand-primary"
                            />
                            <span className="text-slate-800 dark:text-slate-200">{option}</span>
                        </label>
                    ))}
                </div>
            );
        case 'dropdown':
             return (
                 <select
                    value={answer || ''}
                    onChange={(e) => setAnswer(questionId, e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                 >
                    <option value="" disabled>Pilih salah satu...</option>
                    {(question.options || []).map(option => (
                         <option key={option} value={option}>{option}</option>
                    ))}
                 </select>
             )
        default:
            return <p className="text-sm text-red-500">Tipe pertanyaan tidak didukung.</p>;
    }
};

const QuestionnaireForm: React.FC<QuestionnaireFormProps> = ({ questionnaire, onSubmit, isLoading = false }) => {
    const [answers, setAnswers] = useState<Record<string, any>>({});
    
    const handleSetAnswer = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(answers);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {questionnaire.description && <p className="text-sm text-slate-600 dark:text-slate-400">{questionnaire.description}</p>}
            <div className="space-y-6 max-h-[60vh] overflow-y-auto -mr-3 pr-3">
                {questionnaire.questions.map((q, index) => (
                    <div key={q.id}>
                        <label className="block text-md font-semibold text-slate-800 dark:text-slate-100 mb-3">
                            {index + 1}. {q.text}
                        </label>
                        {renderQuestion(q, answers[q.id], handleSetAnswer)}
                    </div>
                ))}
            </div>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-brand-primary text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-brand-secondary transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Mengirim...' : 'Kirim Feedback'}
                </button>
            </div>
        </form>
    );
};

export default QuestionnaireForm;
