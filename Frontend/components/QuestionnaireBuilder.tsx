import React, { useState } from 'react';
import type { Questionnaire, Question, QuestionType } from '../types';
import { PlusIcon, ArrowLeftIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, DuplicateIcon, GripVerticalIcon } from './common/Icons';

interface QuestionnaireBuilderProps {
  questionnaire?: Questionnaire; // If undefined, it's a new questionnaire
  onClose: () => void;
  onSave: (data: Omit<Questionnaire, 'id' | 'responseCount' | 'lastModified'> & { id?: number }) => void;
}

const QuestionCard: React.FC<{ 
    question: Question; 
    index: number; 
    total: number;
    onUpdate: (updatedQuestion: Question) => void;
    onDelete: () => void;
    onMove: (direction: 'up' | 'down') => void;
    onDuplicate: () => void;
}> = ({ question, index, total, onUpdate, onDelete, onMove, onDuplicate }) => {
    
    const questionTypeOptions: { value: QuestionType, label: string }[] = [
        { value: 'short_text', label: 'Jawaban Singkat' },
        { value: 'long_text', label: 'Paragraf' },
        { value: 'multiple_choice', label: 'Pilihan Ganda' },
        { value: 'dropdown', label: 'Dropdown' },
        { value: 'yes_no', label: 'Ya/Tidak' },
        { value: 'rating_5', label: 'Rating Bintang (1-5)' },
        { value: 'rating_10', label: 'Skala Angka (1-10)' },
    ];
    
    const hasOptions = ['multiple_choice', 'dropdown'].includes(question.type);

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex space-x-2 sm:space-x-4">
            <div className="flex flex-col items-center space-y-1 text-slate-400 pt-1">
                <GripVerticalIcon className="w-5 h-5 cursor-grab" />
            </div>
            <div className="flex-1">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <input
                        type="text"
                        value={question.text}
                        onChange={(e) => onUpdate({ ...question, text: e.target.value })}
                        placeholder={`Pertanyaan ${index + 1}`}
                        className="w-full text-md font-semibold bg-transparent focus:outline-none text-slate-800 dark:text-slate-100"
                    />
                     <select 
                        value={question.type} 
                        onChange={(e) => onUpdate({ ...question, type: e.target.value as QuestionType, options: hasOptions ? (question.options || ['Opsi 1']) : undefined })}
                        className="ml-0 sm:ml-4 text-sm bg-slate-100 dark:bg-slate-700 border-none rounded-md p-1.5 focus:ring-1 focus:ring-brand-primary w-full sm:w-auto"
                    >
                        {questionTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>

                {hasOptions && (
                    <div className="mt-4 pl-2 space-y-2">
                        {(question.options || []).map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center group">
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => {
                                        const newOptions = [...(question.options || [])];
                                        newOptions[optIndex] = e.target.value;
                                        onUpdate({ ...question, options: newOptions });
                                    }}
                                    className="w-full text-sm bg-transparent focus:outline-none p-1 rounded focus:bg-slate-100 dark:focus:bg-slate-700"
                                />
                                <button
                                    onClick={() => {
                                        const newOptions = (question.options || []).filter((_, i) => i !== optIndex);
                                        onUpdate({ ...question, options: newOptions });
                                    }}
                                    className="ml-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <button
                             onClick={() => {
                                const newOptions = [...(question.options || []), `Opsi ${(question.options?.length || 0) + 1}`];
                                onUpdate({ ...question, options: newOptions });
                            }}
                            className="text-xs font-semibold text-brand-primary hover:underline mt-2"
                        >
                            + Tambah Opsi
                        </button>
                    </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-1 text-slate-600">
                    <button onClick={() => onMove('up')} disabled={index === 0} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"><ChevronUpIcon className="w-5 h-5"/></button>
                    <button onClick={() => onMove('down')} disabled={index === total - 1} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"><ChevronDownIcon className="w-5 h-5"/></button>
                    <button onClick={onDuplicate} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><DuplicateIcon className="w-5 h-5"/></button>
                    <button onClick={onDelete} className="p-1.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"><TrashIcon className="w-5 h-5"/></button>
                </div>
            </div>
        </div>
    );
};


const QuestionnaireBuilder: React.FC<QuestionnaireBuilderProps> = ({ questionnaire, onClose, onSave }) => {
    const isNew = !questionnaire;
    const [title, setTitle] = useState(questionnaire?.name || '');
    const [description, setDescription] = useState(questionnaire?.description || '');
    const [questions, setQuestions] = useState<Question[]>(questionnaire?.questions || [{id: `q_${Date.now()}`, text: '', type: 'rating_5'}]);

    const addQuestion = () => {
        const newQuestion: Question = {
            id: `q_${Date.now()}`,
            text: '',
            type: 'short_text',
        };
        setQuestions([...questions, newQuestion]);
    };
    
    const updateQuestion = (index: number, updatedQuestion: Question) => {
        const newQuestions = [...questions];
        newQuestions[index] = updatedQuestion;
        setQuestions(newQuestions);
    };

    const deleteQuestion = (index: number) => {
        if(questions.length > 1) {
            setQuestions(questions.filter((_, i) => i !== index));
        } else {
            alert("Kuesioner harus memiliki setidaknya satu pertanyaan.");
        }
    };
    
    const moveQuestion = (index: number, direction: 'up' | 'down') => {
        const newQuestions = [...questions];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
        [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
        setQuestions(newQuestions);
    };
    
    const duplicateQuestion = (index: number) => {
        const questionToDuplicate = questions[index];
        const newQuestion = { ...questionToDuplicate, id: `q_${Date.now()}` };
        const newQuestions = [...questions];
        newQuestions.splice(index + 1, 0, newQuestion);
        setQuestions(newQuestions);
    };

    const handleSave = () => {
        if (!title.trim()) {
            alert('Judul kuesioner tidak boleh kosong.');
            return;
        }
        const finalData = {
            name: title,
            description,
            questions,
        };
        if (!isNew && questionnaire) {
            onSave({ id: questionnaire.id, ...finalData });
        } else {
            onSave(finalData);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <button onClick={onClose} className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-accent">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    Kembali ke Daftar
                </button>
                 <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button onClick={handleSave} className="w-full sm:w-auto px-4 py-2 text-sm font-semibold bg-brand-primary hover:bg-brand-secondary text-white rounded-lg shadow-md transition-all">
                        {isNew ? 'Terbitkan' : 'Simpan Perubahan'}
                    </button>
                </div>
            </header>

            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Judul Kuesioner"
                        className="w-full text-2xl font-bold bg-transparent focus:outline-none text-slate-800 dark:text-slate-100"
                    />
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tambahkan deskripsi singkat (opsional)..."
                        rows={2}
                        className="w-full mt-2 text-sm bg-transparent focus:outline-none text-slate-600 dark:text-slate-400 resize-none"
                    />
                </div>

                {questions.map((q, index) => (
                    <QuestionCard 
                        key={q.id} 
                        question={q} 
                        index={index}
                        total={questions.length}
                        onUpdate={(updated) => updateQuestion(index, updated)}
                        onDelete={() => deleteQuestion(index)}
                        onMove={(dir) => moveQuestion(index, dir)}
                        onDuplicate={() => duplicateQuestion(index)}
                    />
                ))}

                <button onClick={addQuestion} className="w-full flex items-center justify-center space-x-2 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <PlusIcon className="w-5 h-5" />
                    <span className="font-semibold">Tambah Pertanyaan</span>
                </button>
            </div>
        </div>
    );
};

export default QuestionnaireBuilder;