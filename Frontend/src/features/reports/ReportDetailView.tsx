import React, { useMemo, useState } from 'react';
import type { Questionnaire, Review, Question } from '../../types';
// Temporary inline icons to fix import issues
const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
);

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
);

const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
);

const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
);

// Helper to generate a single mock answer for a given question type
const generateMockAnswerForQuestion = (question: Question) => {
    switch (question.type) {
        case 'yes_no':
            return Math.random() > 0.5 ? 'Ya' : 'Tidak';
        case 'multiple_choice':
        case 'dropdown':
            return question.options?.[Math.floor(Math.random() * question.options.length)] || 'Opsi A';
        case 'rating_10':
            return Math.floor(Math.random() * 10) + 1;
        default:
            return '-';
    }
};

// Main Component
interface ReportDetailViewProps {
    questionnaire: Questionnaire;
    reviews: Review[];
    onClose: () => void;
}

const ReportDetailView: React.FC<ReportDetailViewProps> = ({ questionnaire, reviews, onClose }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fullResponses = useMemo(() => {
        return reviews.map(review => {
            const answers: Record<string, any> = {};
            questionnaire.questions.forEach(q => {
                if (q.type === 'rating_5') {
                    answers[q.id] = `${review.rating} ★`;
                } else if (q.type === 'long_text' || q.type === 'short_text') {
                    // Use the main comment for the first text question, generate for others
                    const firstTextQuestionId = questionnaire.questions.find(qt => ['long_text', 'short_text'].includes(qt.type))?.id;
                    answers[q.id] = (q.id === firstTextQuestionId) ? review.comment : 'Jawaban teks simulasi.';
                } else {
                    answers[q.id] = generateMockAnswerForQuestion(q);
                }
            });
            return {
                ...review,
                answers,
            };
        });
    }, [reviews, questionnaire]);

    const totalPages = Math.ceil(fullResponses.length / itemsPerPage);
    const paginatedResponses = fullResponses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleDownload = () => {
        alert(`Data CSV untuk "${questionnaire.name}" sedang dibuat dan akan diunduh... (simulasi)`);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <button onClick={onClose} className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-accent">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    Kembali ke Daftar Laporan
                </button>
            </header>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{questionnaire.name}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{questionnaire.responseCount} Total Responden</p>
                    </div>
                    <button 
                        onClick={handleDownload}
                        className="flex items-center text-xs font-semibold bg-brand-primary hover:bg-brand-secondary text-white px-3 py-2 rounded-md transition-colors shadow-sm"
                    >
                        <DownloadIcon className="w-4 h-4 mr-2"/>
                        Unduh CSV
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-slate-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th scope="col" className="px-6 py-3">Timestamp</th>
                                {questionnaire.questions.map((q, index) => (
                                    <th key={q.id} scope="col" className="px-6 py-3 whitespace-nowrap">{`Q${index + 1}: ${q.text.substring(0, 30)}...`}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedResponses.map(response => (
                                <tr key={response.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600/20">
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">{response.timestamp.toLocaleString()}</td>
                                    {questionnaire.questions.map(q => (
                                        <td key={`${response.id}-${q.id}`} className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                            {response.answers[q.id]?.toString() || '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {totalPages > 1 && (
                    <nav className="flex items-center justify-between p-4" aria-label="Table navigation">
                        <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                            Menampilkan <span className="font-semibold text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, fullResponses.length)}</span> dari <span className="font-semibold text-slate-900 dark:text-white">{fullResponses.length}</span>
                        </span>
                        <ul className="inline-flex items-center -space-x-px">
                            <li>
                                <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-3 py-2 ml-0 leading-tight text-slate-500 bg-white border border-slate-300 rounded-l-lg hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white disabled:opacity-50">
                                    <ChevronLeftIcon className="w-4 h-4" />
                                </button>
                            </li>
                            <li>
                                <span className="px-3 py-2 leading-tight text-slate-500 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white">
                                    {currentPage}
                                </span>
                            </li>
                            <li>
                                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-3 py-2 leading-tight text-slate-500 bg-white border border-slate-300 rounded-r-lg hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white disabled:opacity-50">
                                    <ChevronRightIcon className="w-4 h-4" />
                                </button>
                            </li>
                        </ul>
                    </nav>
                )}
            </div>
            {paginatedResponses.length === 0 && (
                 <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300">Tidak Ada Data Respon</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kuesioner ini belum menerima respon apa pun.</p>
                </div>
            )}
        </div>
    );
};

export default ReportDetailView;
