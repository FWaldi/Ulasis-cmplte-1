import React, { useState } from 'react';
import type { Questionnaire } from '../../types';
import QuestionnaireForm from './QuestionnaireForm';
// Temporary inline icon to fix import issues
const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);
import { responseService } from '../../services/api/responseService';

interface PublicQuestionnaireViewProps {
    questionnaire: Questionnaire;
    onAddReview?: (newReviewData: { rating: number; comment: string; source?: string; questionnaireId?: number, questionnaireName?: string }) => void;
    onClosePreview: () => void;
}

const PublicQuestionnaireView: React.FC<PublicQuestionnaireViewProps> = ({ questionnaire, onAddReview, onClosePreview }) => {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (answers: Record<string, any>) => {
        setIsLoading(true);
        setError('');

        try {
            if (!onAddReview) {
                // Submit to API only if not in demo mode
                const responses = Object.entries(answers).map(([questionId, answer]) => ({
                    questionId,
                    answer,
                }));

                await responseService.submitAnonymousResponse({
                    questionnaireId: questionnaire.id,
                    responses,
                    deviceFingerprint: navigator.userAgent, // Simple fingerprint
                });
            }

            // If onAddReview is provided (for demo mode), call it
            if (onAddReview) {
                const ratingQuestion = questionnaire.questions.find(q => q.type === 'rating_5');
                const commentQuestion = questionnaire.questions.find(q => q.type === 'long_text' || q.type === 'short_text');

                const rating = ratingQuestion ? answers[ratingQuestion.id] : 3;
                let comment = commentQuestion ? answers[commentQuestion.id] : "No comment provided.";

                if (!comment) {
                    const allAnswers = Object.entries(answers).map(([key, value]) => {
                        const questionText = questionnaire.questions.find(q => q.id === key)?.text;
                        return `${questionText}: ${value}`;
                    }).join('; ');
                    comment = allAnswers || `Submitted feedback for "${questionnaire.name}".`
                }

                if (rating) {
                    onAddReview({
                        rating: parseInt(rating, 10),
                        comment: comment,
                        source: 'Pratinjau Formulir',
                        questionnaireId: questionnaire.id,
                        questionnaireName: questionnaire.name
                    });
                }
            }

            setIsSubmitted(true);
        } catch (err: any) {
            setError(err.message || 'Failed to submit response. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-lg mx-auto">
                <div className="text-center mb-6">
                     <div className="flex justify-center items-center mb-4">
                        <div className="bg-brand-primary p-2 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.84 18.16A4 4 0 0115 20a4 4 0 01-2.84-1.16m5.68-1.68A4 4 0 0015 13a4 4 0 00-2.84 1.16m5.68-1.68L15 13m2.84 3.48L15 13m0 0l-2.84 3.48m5.68-1.68a4 4 0 01-8.48 0L15 13m-2.84 3.48a4 4 0 01-2.84-1.16m0 0A4 4 0 019 13a4 4 0 01-2.84 1.16M9 13l2.84 3.48" /></svg>
                        </div>
                        <h1 className="text-2xl font-bold ml-3 tracking-tight text-slate-800 dark:text-slate-100">Kopi Senja</h1>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-6 sm:p-8 relative">
                     {!isSubmitted && (
                         <button
                             onClick={onClosePreview}
                             className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                             title="Tutup"
                         >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                             </svg>
                         </button>
                     )}
                     {isSubmitted ? (
                        <div className="text-center py-8 animate-fade-in">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                                <CheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Terima Kasih!</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-8">
                                Ulasan Anda sangat berarti bagi kami untuk terus menjadi lebih baik.
                            </p>
                             <button
                                onClick={onClosePreview}
                                className="w-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-8 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-all duration-300"
                            >
                                Tutup Pratinjau
                            </button>
                        </div>
                     ) : (
                         <div className="animate-fade-in">
                              <div className="text-center mb-6">
                                 <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{questionnaire.name}</h2>
                             </div>
                             {error && (
                                 <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded-lg text-red-800 dark:text-red-200 text-sm">
                                     {error}
                                 </div>
                             )}
                             <QuestionnaireForm questionnaire={questionnaire} onSubmit={handleSubmit} isLoading={isLoading} />
                         </div>
                     )}
                </div>
                 <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
                    Didukung oleh <b className="font-semibold text-slate-600 dark:text-slate-300">ULASIS</b>
                </p>
            </div>
        </div>
    );
};

export default PublicQuestionnaireView;