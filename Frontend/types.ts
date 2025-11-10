export type Page = 
  | 'dashboard' 
  | 'inbox' 
  | 'active-forms'
  | 'qr-codes' 
  | 'questionnaires' 
  | 'analytics' 
  | 'reports' 
  | 'settings' 
  | 'panduan'
  | 'landing' 
  | 'login' 
  | 'register' 
  | 'verify-email' 
  | 'about' 
  | 'blog' 
  | 'careers' 
  | 'contact' 
  | 'features' 
  | 'help' 
  | 'pricing'
  | 'public-form-preview';
  
export type Theme = 'light' | 'dark';
export type DemoPlan = 'gratis' | 'starter' | 'bisnis';

export enum ReviewStatus {
    New = 'Baru',
    InProgress = 'Dalam Proses',
    Resolved = 'Selesai',
}

export enum Sentiment {
    Positive = 'Positif',
    Neutral = 'Netral',
    Negative = 'Negatif',
}

export interface Review {
    id: number;
    rating: number;
    comment: string;
    timestamp: Date;
    source: string;
    tags: string[];
    status: ReviewStatus;
    sentiment: Sentiment;
    topics: string[];
    questionnaireId?: number;
    questionnaireName?: string;
}

export interface TrendData {
    date: string;
    'Average Rating': number;
}

export type QuestionType = 'short_text' | 'long_text' | 'multiple_choice' | 'dropdown' | 'yes_no' | 'rating_5' | 'rating_10';

export interface Question {
    id: string;
    text: string;
    type: QuestionType;
    options?: string[];
    required?: boolean;
}

export interface Questionnaire {
    id: number;
    name: string;
    description: string;
    questions: Question[];
    responseCount: number;
    lastModified: Date;
}

export interface QRCode {
    id: number;
    name: string;
    linkedForm: string;
    questionnaireId: number;
    scans: number;
    color?: string;
    logoUrl?: string;
}

export interface Invoice {
    id: string;
    date: string;
    description: string;
    amount: number;
    status: 'Paid' | 'Pending' | 'Failed';
}

export interface PaymentMethod {
    type: 'DANA';
    phoneNumber: string;
}

export interface NotificationSettings {
    instantNegative: boolean;
    dailySummary: boolean;
    weeklySummary: boolean;

    productUpdates: boolean;
}