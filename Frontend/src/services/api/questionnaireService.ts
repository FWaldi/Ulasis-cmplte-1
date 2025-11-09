import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { DemoPlan } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface Questionnaire {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  category_mapping: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  questions?: Array<{
    id: string;
    text: string;
    type: 'short_text' | 'long_text' | 'multiple_choice' | 'dropdown' | 'yes_no' | 'rating_5' | 'rating_10';
    options?: string[];
    required?: boolean;
    orderIndex?: number;
  }>;
}

export interface CreateQuestionnaireData {
  title: string;
  description?: string;
  category_mapping: Record<string, string>;
  questions: Array<{
    id: string;
    text: string;
    type: 'short_text' | 'long_text' | 'multiple_choice' | 'dropdown' | 'yes_no' | 'rating_5' | 'rating_10';
    options?: string[];
    required?: boolean;
    orderIndex?: number;
  }>;
}

export interface UpdateQuestionnaireData {
  title?: string;
  category_mapping?: Record<string, string>;
  is_active?: boolean;
  questions?: any[];
}

export interface QuestionnaireListResponse {
  success: boolean;
  message: string;
  data: {
    questionnaires: Questionnaire[];
    usage: {
      used: number;
      limit: number;
      plan: string;
    };
  };
}

export interface QuestionnaireResponse {
  success: boolean;
  message: string;
  data: Questionnaire;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

class QuestionnaireService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  private isDemoMode(): boolean {
    return localStorage.getItem('isDemoMode') === 'true';
  }

  private getDemoPlan(): DemoPlan {
    return (localStorage.getItem('demoPlan') as DemoPlan) || 'free';
  }

  async getQuestionnaires(): Promise<QuestionnaireListResponse> {
    if (this.isDemoMode()) {
      // Return mock data for demo mode
      const plan = this.getDemoPlan();
      const limits = { free: 1, starter: 5, business: 100 };
      const limit = limits[plan];
      const used = 0; // Start with 0 for tests
      return {
        success: true,
        message: 'Demo questionnaires retrieved',
        data: {
          questionnaires: [],
          usage: {
            used,
            limit,
            plan
          }
        }
      };
    }

    try {
      const response: AxiosResponse<QuestionnaireListResponse> = await this.axiosInstance.get('/questionnaires');
      return response.data;
    } catch (error: any) {
      console.error('Get questionnaires error:', error);
      throw error;
    }
  }

  async createQuestionnaire(data: CreateQuestionnaireData): Promise<QuestionnaireResponse> {
    if (this.isDemoMode()) {
      // Simulate success in demo mode
      const plan = this.getDemoPlan();
      const limits = { free: 1, starter: 5, business: 100 };
      const limit = limits[plan];
      const used = plan === 'free' ? 1 : 0; // Check if can create
      if (used >= limit) {
        throw new Error(`Demo plan ${plan} allows only ${limit} questionnaire(s)`);
      }
      return {
        success: true,
        message: 'Demo questionnaire created',
        data: {
          id: Date.now(),
          user_id: 1,
          title: data.title,
          category_mapping: data.category_mapping,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      };
    }

    try {
      const response: AxiosResponse<QuestionnaireResponse> = await this.axiosInstance.post('/questionnaires', data);
      const responseData = response.data;
      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to create questionnaire');
      }
      return responseData;
    } catch (error: any) {
      console.error('Create questionnaire error:', error);
      throw error;
    }
  }

  async updateQuestionnaire(id: number, data: UpdateQuestionnaireData): Promise<QuestionnaireResponse> {
    try {
      const response: AxiosResponse<QuestionnaireResponse> = await this.axiosInstance.put(`/questionnaires/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Update questionnaire error:', error);
      throw error;
    }
  }

  async deleteQuestionnaire(id: number): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.axiosInstance.delete(`/questionnaires/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Delete questionnaire error:', error);
      throw error;
    }
  }

  async getQuestionnaire(id: number): Promise<QuestionnaireResponse> {
    if (this.isDemoMode()) {
      // Return mock data for demo mode with sample questions
      return {
        success: true,
        message: 'Demo questionnaire retrieved',
        data: {
          id: id,
          user_id: 1,
          title: 'Sample Customer Satisfaction Survey',
          description: 'Please rate your experience with our service',
          category_mapping: {
            'q_1': 'Service Quality',
            'q_2': 'Product Quality',
            'q_3': 'Overall Experience'
          },
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          questions: [
            {
              id: 'q_1',
              text: 'How would you rate our service quality?',
              type: 'rating_5',
              required: true,
              orderIndex: 0
            },
            {
              id: 'q_2',
              text: 'How would you rate our product quality?',
              type: 'rating_5',
              required: true,
              orderIndex: 1
            },
            {
              id: 'q_3',
              text: 'Would you recommend us to others?',
              type: 'yes_no',
              required: true,
              orderIndex: 2
            },
            {
              id: 'q_4',
              text: 'Any additional comments or suggestions?',
              type: 'long_text',
              required: false,
              orderIndex: 3
            }
          ]
        }
      };
    }

    try {
      const response: AxiosResponse<QuestionnaireResponse> = await this.axiosInstance.get(`/questionnaires/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Get questionnaire error:', error);
      throw error;
    }
  }

  // Check if user can create more questionnaires
  async canCreateQuestionnaire(): Promise<{ canCreate: boolean; usage: { used: number; limit: number; plan: string } }> {
    try {
      const response = await this.getQuestionnaires();
      const { used, limit } = response.data.usage;
      return {
        canCreate: used < limit,
        usage: response.data.usage,
      };
    } catch (error) {
      console.error('Check create permission error:', error);
      // Assume can create if check fails
      return {
        canCreate: true,
        usage: { used: 0, limit: 10, plan: 'free' },
      };
    }
  }
}

export const questionnaireService = new QuestionnaireService();