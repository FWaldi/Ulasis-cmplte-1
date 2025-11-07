import React, { useState } from 'react';
import type { Questionnaire } from '../types';
import Modal from './common/Modal';
import QuestionnaireForm from './QuestionnaireForm';

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
                Halaman ini menyimulasikan apa yang dilihat pelanggan ketika mereka mengakses formulir Anda. Pilih salah satu untuk mengisi.
            </p>
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
            {selectedQuestionnaire && (
                <Modal title={selectedQuestionnaire.name} onClose={() => setSelectedQuestionnaire(null)}>
                    <QuestionnaireForm questionnaire={selectedQuestionnaire} onSubmit={handleSubmit} />
                </Modal>
            )}
        </div>
    );
};

export default ActiveForms;