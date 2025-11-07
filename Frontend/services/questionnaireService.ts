import { apiService, ApiResponse, PaginatedResponse } from './apiService';

export interface Question {
  id: string;
  type: 'rating' | 'text' | 'multiple_choice' | 'checkbox' | 'nps';
  text: string;
  options?: string[];
  required: boolean;
  order: number;
  category?: string;
}

export interface Questionnaire {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  isActive: boolean;
  qrCodeUrl?: string;
  responseCount: number;
  category?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface CreateQuestionnaireData {
  title: string;
  description?: string;
  questions: Omit<Question, 'id'>[];
  category?: string;
}

export interface UpdateQuestionnaireData extends Partial<CreateQuestionnaireData> {
  isActive?: boolean;
}

export interface QuestionnaireResponse {
  id: string;
  questionnaireId: string;
  answers: {
    questionId: string;
    value: string | number | string[];
  }[];
  submittedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

class QuestionnaireService {
  async getQuestionnaires(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Questionnaire>> {
    return apiService.authenticatedRequest<Questionnaire[]>(
      `/questionnaires?page=${page}&limit=${limit}`
    );
  }

  async getQuestionnaire(id: string): Promise<ApiResponse<Questionnaire>> {
    return apiService.authenticatedRequest<Questionnaire>(`/questionnaires/${id}`);
  }

  async createQuestionnaire(
    data: CreateQuestionnaireData
  ): Promise<ApiResponse<Questionnaire>> {
    return apiService.authenticatedRequest<Questionnaire>('/questionnaires', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateQuestionnaire(
    id: string,
    data: UpdateQuestionnaireData
  ): Promise<ApiResponse<Questionnaire>> {
    return apiService.authenticatedRequest<Questionnaire>(`/questionnaires/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteQuestionnaire(id: string): Promise<ApiResponse<void>> {
    return apiService.authenticatedRequest<void>(`/questionnaires/${id}`, {
      method: 'DELETE',
    });
  }

  async duplicateQuestionnaire(id: string): Promise<ApiResponse<Questionnaire>> {
    return apiService.authenticatedRequest<Questionnaire>(
      `/questionnaires/${id}/duplicate`,
      { method: 'POST' }
    );
  }

  async generateQRCode(id: string): Promise<ApiResponse<{ qrCodeUrl: string }>> {
    return apiService.authenticatedRequest<{ qrCodeUrl: string }>(
      `/questionnaires/${id}/qr-code`,
      { method: 'POST' }
    );
  }

  async getPublicQuestionnaire(id: string): Promise<ApiResponse<Questionnaire>> {
    return apiService.get<Questionnaire>(`/public/questionnaires/${id}`);
  }

  async submitResponse(
    questionnaireId: string,
    answers: {
      questionId: string;
      value: string | number | string[];
    }[]
  ): Promise<ApiResponse<QuestionnaireResponse>> {
    return apiService.post<QuestionnaireResponse>(
      `/public/questionnaires/${questionnaireId}/responses`,
      { answers }
    );
  }

  async getResponses(
    questionnaireId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<QuestionnaireResponse>> {
    return apiService.authenticatedRequest<QuestionnaireResponse[]>(
      `/questionnaires/${questionnaireId}/responses?page=${page}&limit=${limit}`
    );
  }

  async getResponse(id: string): Promise<ApiResponse<QuestionnaireResponse>> {
    return apiService.authenticatedRequest<QuestionnaireResponse>(
      `/responses/${id}`
    );
  }

  async deleteResponse(id: string): Promise<ApiResponse<void>> {
    return apiService.authenticatedRequest<void>(`/responses/${id}`, {
      method: 'DELETE',
    });
  }

  async exportResponses(
    questionnaireId: string,
    format: 'csv' | 'excel' = 'csv'
  ): Promise<ApiResponse<{ downloadUrl: string }>> {
    return apiService.authenticatedRequest<{ downloadUrl: string }>(
      `/questionnaires/${questionnaireId}/export?format=${format}`,
      { method: 'POST' }
    );
  }

  // Category management
  async getCategories(): Promise<ApiResponse<string[]>> {
    return apiService.authenticatedRequest<string[]>('/questionnaires/categories');
  }

  async updateCategory(
    questionnaireId: string,
    category: string
  ): Promise<ApiResponse<Questionnaire>> {
    return apiService.authenticatedRequest<Questionnaire>(
      `/questionnaires/${questionId}/category`,
      {
        method: 'PUT',
        body: JSON.stringify({ category }),
      }
    );
  }

  // Analytics integration
  async getQuestionnaireAnalytics(
    questionnaireId: string
  ): Promise<ApiResponse<{
    totalResponses: number;
    averageRating: number;
    responseRate: number;
    responsesByDate: { date: string; count: number }[];
    categoryBreakdown: { category: string; count: number; averageRating: number }[];
  }>> {
    return apiService.authenticatedRequest(
      `/questionnaires/${questionnaireId}/analytics`
    );
  }

  // Validation helpers
  validateQuestionnaire(data: CreateQuestionnaireData): string[] {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!data.questions || data.questions.length === 0) {
      errors.push('At least one question is required');
    } else {
      data.questions.forEach((question, index) => {
        if (!question.text || question.text.trim().length === 0) {
          errors.push(`Question ${index + 1} text is required`);
        }

        if (!question.type) {
          errors.push(`Question ${index + 1} type is required`);
        }

        if (
          (question.type === 'multiple_choice' || question.type === 'checkbox') &&
          (!question.options || question.options.length === 0)
        ) {
          errors.push(`Question ${index + 1} options are required`);
        }
      });
    }

    return errors;
  }
}

export const questionnaireService = new QuestionnaireService();
export default questionnaireService;