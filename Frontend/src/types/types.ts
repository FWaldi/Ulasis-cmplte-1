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
export type DemoPlan = 'free' | 'starter' | 'business';

export enum ReviewStatus {
    New = 'New',
    InProgress = 'In Progress',
    Resolved = 'Resolved',
}

export enum Sentiment {
    Positive = 'Positive',
    Neutral = 'Neutral',
    Negative = 'Negative',
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
     'Avg Rating': number;
     'Response Rate': number;
 }

export interface BreakdownData {
     area: string;
     avgRating: string;
     responses: number;
     trend: {
         change: number;
         direction: 'up' | 'down';
     };
     status: 'Good' | 'Monitor' | 'Urgent';
 }

export type QuestionType = 'short_text' | 'long_text' | 'multiple_choice' | 'dropdown' | 'yes_no' | 'rating_5' | 'rating_10';

export interface Question {
    id: string;
    text: string;
    type: QuestionType;
    options?: string[];
    required?: boolean;
    orderIndex?: number;
}

export interface Questionnaire {
     id: number;
     name: string;
     description: string;
     questions?: Question[];
     responseCount: number;
     lastModified: Date;
     category_mapping?: Record<string, string>;
     is_active?: boolean;
     created_at?: string;
     updated_at?: string;
     user_id?: number;
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

// Analytics API Types (for compatibility with backend)
export interface BubbleAnalyticsData {
    questionnaire_id: number;
    categories: Array<{
        name: string;
        rating: number;
        response_count: number;
        response_rate: number;
        color: 'red' | 'yellow' | 'green';
        trend: 'improving' | 'stable' | 'declining';
    }>;
    period_comparison: {
        current_period: string;
        previous_period: string;
        overall_trend: 'improving' | 'stable' | 'declining';
    };
    total_responses: number;
    response_rate: number;
    generated_at: string;
}

export interface TimeComparisonData {
    questionnaire_id: number;
    comparison_type: 'week_over_week' | 'custom';
    current_period: {
        start_date: string;
        end_date: string;
        categories: Array<{
            name: string;
            rating: number;
            response_count: number;
            response_rate: number;
            color: 'red' | 'yellow' | 'green';
            trend: 'improving' | 'stable' | 'declining';
        }>;
    };
    previous_period: {
        start_date: string;
        end_date: string;
        categories: Array<{
            name: string;
            rating: number;
            response_count: number;
            response_rate: number;
            color: 'red' | 'yellow' | 'green';
            trend: 'improving' | 'stable' | 'declining';
        }>;
    };
    trend_analysis: {
        overall_trend: 'improving' | 'stable' | 'declining';
        category_trends: Array<{
            category: string;
            trend: 'improving' | 'stable' | 'declining';
            change_percentage: number;
        }>;
    };
}

export interface AnalyticsSummaryData {
    questionnaire_id: number;
    total_categories: number;
    overall_rating: number;
    total_responses: number;
    response_rate: number;
    color_distribution: {
        red: number;
        yellow: number;
        green: number;
    };
    overall_trend: 'improving' | 'stable' | 'declining';
    generated_at: string;
}

export interface AnalyticsDashboardData {
    kpi: {
        totalResponses: number;
        avgRating: number;
        responseRate: number;
        positiveSentiment: number;
    };
    trends: Array<{
        date: string;
        avgRating: number;
        responseRate: number;
    }>;
    breakdown: Array<{
        area: string;
        avgRating: number;
        responses: number;
        trend: {
            change: number;
            direction: 'up' | 'down' | 'stable';
        };
        status: 'Good' | 'Monitor' | 'Urgent';
    }>;
    period: string;
    generatedAt: string;
}

// User and Authentication Types
export interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    businessName?: string;
    subscriptionPlan: 'free' | 'starter' | 'business';
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

// API Request/Response Types
export interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    businessName?: string;
}

export interface AuthResponse {
    user: User;
    token: string;
    refreshToken: string;
}

export interface TokenResponse {
    token: string;
    refreshToken: string;
}

export interface CreateQuestionnaireData {
    name: string;
    description: string;
    questions: Question[];
}

export interface UpdateQuestionnaireData {
    name?: string;
    description?: string;
    questions?: Question[];
}

export interface BubbleAnalytics {
    questionnaire_id: number;
    categories: Array<{
        name: string;
        rating: number;
        response_count: number;
        response_rate: number;
        color: 'red' | 'yellow' | 'green';
        trend: 'improving' | 'stable' | 'declining';
    }>;
    period_comparison: {
        current_period: string;
        previous_period: string;
        overall_trend: 'improving' | 'stable' | 'declining';
    };
    total_responses: number;
    response_rate: number;
    generated_at: string;
}

export interface TimeComparisonParams {
    comparison_type?: 'week_over_week' | 'custom';
    current_start?: string;
    current_end?: string;
    previous_start?: string;
    previous_end?: string;
}

export interface AnonymousResponseData {
    questionnaireId: number;
    responses: Array<{
        questionId: string;
        answer: any;
    }>;
    deviceFingerprint?: string;
    userAgent?: string;
    ipAddress?: string;
    location?: {
        country?: string;
        city?: string;
    };
}

export interface ResponseSubmission {
    id: number;
    questionnaireId: number;
    submittedAt: string;
    status: 'success' | 'error';
}

export interface DetailedResponse {
    id: number;
    questionnaireId: number;
    questionnaireName: string;
    responses: Array<{
        questionId: string;
        questionText: string;
        questionType: QuestionType;
        answer: any;
    }>;
    respondentInfo: {
        deviceFingerprint?: string;
        userAgent?: string;
        ipAddress?: string;
        location?: {
            country?: string;
            city?: string;
        };
        source: 'web' | 'qr_scan' | 'manual';
        submittedAt: string;
    };
    sentiment?: {
        overall: 'Positive' | 'Neutral' | 'Negative';
        score: number;
        confidence: number;
    };
    categories?: Array<{
        name: string;
        rating: number;
    }>;
    processedAt: string;
}

export interface ManualResponseData {
    questionnaireId: number;
    responses: Array<{
        questionId: string;
        answer: any;
    }>;
    respondentInfo?: {
        name?: string;
        email?: string;
        phone?: string;
        notes?: string;
    };
    submittedAt?: string;
}