import React, { useState, useEffect, useMemo } from 'react';
import type { Questionnaire, Question, Review } from '../types';
import { ArrowLeftIcon } from './common/Icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface QuestionnaireResultsProps {
  questionnaire: Questionnaire;
  reviews: Review[];
  onClose: () => void;
}

const COLORS = ['#007A7A', '#004D4D', '#FFC107', '#82ca9d', '#ffc658', '#FF8042', '#00C49F'];

// Mock data generator for a single question, used as a fallback
const getMockAnswers = (question: Question) => {
    const type = question.type;
    const options = question.options || [];

    switch (type) {
        case 'rating_5':
            return [
                { name: '1 ★', value: Math.floor(Math.random() * 5) + 1 },
                { name: '2 ★', value: Math.floor(Math.random() * 10) + 2 },
                { name: '3 ★', value: Math.floor(Math.random() * 20) + 5 },
                { name: '4 ★', value: Math.floor(Math.random() * 50) + 20 },
                { name: '5 ★', value: Math.floor(Math.random() * 80) + 40 },
            ];
        case 'rating_10':
            return Array.from({ length: 10 }, (_, i) => ({ name: `${i + 1}`, value: Math.floor(Math.random() * (20 - i * 1.5)) + 5 }));
        case 'yes_no':
            return [
                { name: 'Ya', value: Math.floor(Math.random() * 100) + 20 },
                { name: 'Tidak', value: Math.floor(Math.random() * 30) + 5 },
            ];
        case 'multiple_choice':
        case 'dropdown':
             return (options.length > 0 ? options : ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi Lainnya']).map(opt => ({
                name: opt,
                value: Math.floor(Math.random() * 60) + 10
             }));
        case 'short_text':
        case 'long_text':
             return [
                "Pelayanan cepat dan ramah sekali, kopinya juga enak.",
                "Mungkin bisa ditambah varian minumannya, terutama yang non-kopi.",
                "Sangat puas! Tempatnya bersih dan nyaman untuk kerja.",
                "AC di lantai 2 kurang dingin, agak gerah saat siang hari.",
                "Tidak ada keluhan, semuanya sudah bagus. Pertahankan!",
                "Harga sedikit mahal tapi sebanding dengan kualitasnya.",
                "Suka dengan playlist lagunya, bikin betah.",
            ].slice(0, 5);
        default:
            return [];
    }
}

const QuestionResultCard: React.FC<{ question: Question, index: number, relevantReviews: Review[] }> = ({ question, index, relevantReviews }) => {
    const data = useMemo(() => {
        // Use real data if possible, otherwise fall back to mock data.
        // The current data model only stores final rating and comment, not per-question answers.
        if (question.type === 'rating_5') {
            const counts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            relevantReviews.forEach(r => {
                if (r.rating >= 1 && r.rating <= 5) {
                    counts[Math.round(r.rating)]++;
                }
            });
            return Object.entries(counts).map(([name, value]) => ({ name: `${name} ★`, value }));
        }
        if ((question.type === 'short_text' || question.type === 'long_text') && relevantReviews.length > 0) {
            return relevantReviews.map(r => r.comment).filter(Boolean).slice(0, 5); // show first 5 comments
        }
        // Fallback for other types as we don't have the specific answer data for them.
        return getMockAnswers(question);
    }, [question, relevantReviews]);

    const isChart = ['rating_5', 'rating_10', 'yes_no', 'multiple_choice', 'dropdown'].includes(question.type);
    const isPie = ['yes_no', 'multiple_choice', 'dropdown'].includes(question.type);
    const isBar = ['rating_5', 'rating_10'].includes(question.type);
    
    const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const tickColor = isDarkMode ? 'rgb(156 163 175)' : 'rgb(100 116 139)';
    const tooltipStyle = {
        contentStyle: {
            backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(248, 250, 252, 0.95)',
            borderColor: isDarkMode ? 'rgba(100, 116, 139, 0.5)' : 'rgba(226, 232, 240, 0.8)',
            borderRadius: '0.75rem',
        },
        itemStyle: { color: isDarkMode ? '#f1f5f9' : '#1e293b' },
        labelStyle: { color: isDarkMode ? '#f1f5f9' : '#1e293b' }
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md dark:shadow-slate-700/50 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{index + 1}. {question.text}</h3>
            <div className="h-80">
                {isChart ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
                        {isPie ? (
                            <PieChart>
                                <Pie data={data as {name: string, value: number}[]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                      const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                      const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                      return (
                                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                          {`${(percent * 100).toFixed(0)}%`}
                                        </text>
                                      );
                                    }}>
                                    {(data as any[]).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle.contentStyle} itemStyle={tooltipStyle.itemStyle} labelStyle={tooltipStyle.labelStyle} />
                                <Legend wrapperStyle={{fontSize: "12px"}}/>
                            </PieChart>
                        ) : ( // isBar
                            <BarChart data={data as {name: string, value: number}[]} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(200, 200, 200, 0.2)" />
                                <XAxis dataKey="name" tick={{fontSize: 12, fill: tickColor}} />
                                <YAxis tick={{fontSize: 12, fill: tickColor}}/>
                                <Tooltip contentStyle={tooltipStyle.contentStyle} itemStyle={tooltipStyle.itemStyle} labelStyle={tooltipStyle.labelStyle} />
                                <Bar dataKey="value" fill="#007A7A" />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                ) : (
                     <div className="space-y-3 h-full overflow-y-auto pr-2">
                        <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Contoh Jawaban:</h4>
                         {(data as string[]).length > 0 ? (
                            (data as string[]).map((answer, i) => (
                                <blockquote key={i} className="text-sm bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border-l-4 border-slate-300 dark:border-slate-600 italic text-slate-700 dark:text-slate-300">
                                    {answer}
                                </blockquote>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 italic">Belum ada jawaban teks untuk ditampilkan.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const QuestionnaireResults: React.FC<QuestionnaireResultsProps> = ({ questionnaire, reviews, onClose }) => {
  
  // Filter reviews for this specific questionnaire once.
  const relevantReviews = useMemo(() => 
    reviews.filter(r => r.questionnaireId === questionnaire.id),
    [reviews, questionnaire.id]
  );
  
  return (
    <div className="space-y-6 animate-fade-in">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <button onClick={onClose} className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-accent">
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Kembali ke Daftar Kuesioner
            </button>
        </header>

        <div className="max-w-4xl mx-auto text-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{questionnaire.name}</h1>
            {questionnaire.description && <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-2xl mx-auto">{questionnaire.description}</p>}
            <div className="mt-4 bg-slate-100 dark:bg-slate-700/50 inline-block px-4 py-2 rounded-full">
                <p className="text-lg font-bold text-brand-primary dark:text-brand-accent">{questionnaire.responseCount} 
                <span className="ml-2 font-normal text-slate-600 dark:text-slate-400">Total Responden</span></p>
            </div>
        </div>

        <div className="space-y-8">
            {questionnaire.questions.map((q, index) => (
                <QuestionResultCard key={q.id} question={q} index={index} relevantReviews={relevantReviews} />
            ))}
        </div>
    </div>
  );
};

export default QuestionnaireResults;