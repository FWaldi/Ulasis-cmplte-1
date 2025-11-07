import React, { useState } from 'react';
import type { Questionnaire, DemoPlan, Review } from '../../types';
import QuestionnaireBuilder from './QuestionnaireBuilder';
import QuestionnaireResults from './QuestionnaireResults';
import QuestionnaireList from './QuestionnaireList';



interface QuestionnairesPageProps {
    questionnaires: Questionnaire[];
    reviews: Review[];
    isDemoMode: boolean;
    demoPlan: DemoPlan;
    usage?: { used: number; limit: number; plan: string };
    isLoading?: boolean;
    onSave: (questionnaire: Omit<Questionnaire, 'id' | 'responseCount' | 'lastModified'> & { id?: number }) => void;
    onDelete: (id: number) => void;
}


const QuestionnairesPage: React.FC<QuestionnairesPageProps> = ({ questionnaires, reviews, isDemoMode, demoPlan, usage, isLoading, onSave, onDelete }) => {
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
        try {
            onSave(data);
            setView('list');
        } catch (error: any) {
            alert(error.message);
        }
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
            return <QuestionnaireList questionnaires={questionnaires} isDemoMode={isDemoMode} demoPlan={demoPlan} usage={usage} isLoading={isLoading} onEdit={handleEdit} onViewResults={handleViewResults} onDelete={handleDeleteWithConfirmation}/>;
    }
};

export default QuestionnairesPage;