import React, { useState } from 'react';
import type { Questionnaire } from '../types';
import Modal from '../../../components/common/Modal';
import QuestionnaireForm from '../questionnaires/QuestionnaireForm';

interface ActiveFormsProps {
    questionnaires: Questionnaire[];
    onAddReview: (newReviewData: { rating: number; comment: string; source?: string; questionnaireId?: number, questionnaireName?: string }) => void;
}

const ActiveForms: React.FC<ActiveFormsProps> = ({ questionnaires, onAddReview }) => {
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);

    const handleSubmit = (answers: Record<string, any>) => {
        // This is a simplified logic to convert form answers to a single review.
        // In a real app, this would be more complex, likely storing full survey responses.
        const ratingQuestion = selectedQuestionnaire?.questions.find(q => q.type === 'rating_5');
        const commentQuestion = selectedQuestionnaire?.questions.find(q => q.type === 'long_text' || q.type === 'short_text');

        const rating = ratingQuestion ? answers[ratingQuestion.id] : 3;
        let comment = commentQuestion ? answers[commentQuestion.id] : "No comment provided.";

        if (!comment) {
             const allAnswers = Object.entries(answers).map(([key, value]) => {
                const questionText = selectedQuestionnaire?.questions.find(q => q.id === key)?.text;
                return `${questionText}: ${value}`;
            }).join('; ');
            comment = allAnswers || `Submitted feedback for "${selectedQuestionnaire?.name}".`
        }

        if (rating) {
            onAddReview({
                rating: parseInt(rating, 10),
                comment: comment,
                source: 'Formulir Aktif',
                questionnaireId: selectedQuestionnaire?.id,
                questionnaireName: selectedQuestionnaire?.name
            });
        }
        
        alert('Terima kasih atas feedback Anda!');
        setSelectedQuestionnaire(null);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Formulir Aktif</h1>
            <p className="text-slate-600 dark:text-slate-400">
                Halaman ini menampilkan formulir aktif yang dapat diakses pelanggan. Pilih salah satu untuk mengisi ulasan.
            </p>
            {questionnaires.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {questionnaires.map(q => (
                        <button
                            key={q.id}
                            onClick={() => setSelectedQuestionnaire(q)}
                            className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50 text-left transition-all hover:shadow-lg hover:-translate-y-1"
                        >
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">{q.name}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{q.description}</p>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-4 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300">Belum Ada Formulir Aktif</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Buat kuesioner terlebih dahulu untuk menampilkan formulir aktif.</p>
                </div>
            )}
            {selectedQuestionnaire && (
                <Modal title={selectedQuestionnaire.name} onClose={() => setSelectedQuestionnaire(null)}>
                    <QuestionnaireForm questionnaire={selectedQuestionnaire} onSubmit={handleSubmit} />
                </Modal>
            )}
        </div>
    );
};

export default ActiveForms;