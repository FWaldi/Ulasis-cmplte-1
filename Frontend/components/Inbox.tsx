import React, { useState, useMemo } from 'react';
import type { Review, Questionnaire } from '../types';
import { ReviewStatus, Sentiment } from '../types';
import { PlusIcon, FilterIcon, ChevronDownIcon } from './common/Icons';

const sentimentColors = {
  [Sentiment.Positive]: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  [Sentiment.Neutral]: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  [Sentiment.Negative]: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

const statusColors = {
  [ReviewStatus.New]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  [ReviewStatus.InProgress]: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  [ReviewStatus.Resolved]: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
};

const ReviewCard: React.FC<{ review: Review; onUpdateStatus: (id: number, status: ReviewStatus) => void; }> = ({ review, onUpdateStatus }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md dark:shadow-slate-700/50 flex space-x-4">
        <div className={`w-1.5 rounded-full ${sentimentColors[review.sentiment]}`}></div>
        <div className="flex-1">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center space-x-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[review.status]}`}>{review.status}</span>
                         <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sentimentColors[review.sentiment]}`}>{review.sentiment}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 mt-2">{review.comment}</p>
                </div>
                <div className="flex-shrink-0 relative group">
                     <select 
                        value={review.status} 
                        onChange={(e) => onUpdateStatus(review.id, e.target.value as ReviewStatus)}
                        className="text-xs bg-slate-100 dark:bg-slate-700 border-none rounded-md py-1 pl-2 pr-6 appearance-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
                    >
                        {Object.values(ReviewStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDownIcon className="w-4 h-4 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
                </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                <div>
                    <span>{review.timestamp.toLocaleString()} · {review.source}</span>
                    {review.questionnaireName && <span className="italic"> · via "{review.questionnaireName}"</span>}
                </div>
                <div className="flex space-x-1">
                    {review.topics.map(topic => <span key={topic} className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{topic}</span>)}
                </div>
            </div>
        </div>
    </div>
);

const Inbox: React.FC<{
    reviews: Review[];
    questionnaires: Questionnaire[];
    onUpdateStatus: (id: number, status: ReviewStatus) => void;
    onGenerateMockReviews: () => void;
}> = ({ reviews, questionnaires, onUpdateStatus, onGenerateMockReviews }) => {
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [questionnaireFilter, setQuestionnaireFilter] = useState<string>('all');
    
    const filteredReviews = useMemo(() => {
        return reviews.filter(r => {
            const statusMatch = statusFilter === 'all' || r.status === statusFilter;
            const questionnaireMatch = questionnaireFilter === 'all' || r.questionnaireId === parseInt(questionnaireFilter, 10);
            return statusMatch && questionnaireMatch;
        });
    }, [reviews, statusFilter, questionnaireFilter]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Inbox</h1>
                 <button 
                    onClick={onGenerateMockReviews}
                    className="flex items-center text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-md transition-colors"
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Simulasikan Ulasan Masuk
                </button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <FilterIcon className="w-5 h-5 text-slate-500"/>
                    <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 text-sm font-semibold rounded-full ${statusFilter === 'all' ? 'bg-brand-primary text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}>All</button>
                    {Object.values(ReviewStatus).map(status => (
                         <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1 text-sm font-semibold rounded-full ${statusFilter === status ? 'bg-brand-primary text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{status}</button>
                    ))}
                </div>
                <div className="relative w-full sm:w-56">
                    <select
                        value={questionnaireFilter}
                        onChange={(e) => setQuestionnaireFilter(e.target.value)}
                        className="w-full text-sm bg-slate-100 dark:bg-slate-700 border-none rounded-md py-1.5 pl-3 pr-8 appearance-none focus:ring-1 focus:ring-brand-primary"
                    >
                        <option value="all">Semua Kuesioner</option>
                        {questionnaires.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                    </select>
                    <ChevronDownIcon className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
                </div>
            </div>

            <div className="space-y-4">
                {filteredReviews.length > 0 ? (
                    filteredReviews.map(review => <ReviewCard key={review.id} review={review} onUpdateStatus={onUpdateStatus} />)
                ) : (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada ulasan</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tidak ada ulasan yang cocok dengan filter Anda.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Inbox;