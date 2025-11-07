import { apiService, ApiResponse, PaginatedResponse } from './apiService';

export interface Answer {
  id: string;
  questionId: string;
  responseId: string;
  value: string | number | string[];
  questionType: 'rating' | 'text' | 'multiple_choice' | 'checkbox' | 'nps';
  createdAt: string;
}

export interface Response {
  id: string;
  questionnaireId: string;
  questionnaireTitle: string;
  answers: Answer[];
  submittedAt: string;
  ipAddress?: string;
  userAgent?: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface CreateResponseData {
  questionnaireId: string;
  answers: {
    questionId: string;
    value: string | number | string[];
  }[];
}

export interface ResponseAnalytics {
  totalResponses: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  averageRating: number;
  responsesByDate: { date: string; count: number }[];
  responsesByQuestionnaire: {
    questionnaireId: string;
    questionnaireTitle: string;
    responseCount: number;
    averageRating: number;
  }[];
}

export interface ResponseFilters {
  status?: 'pending' | 'approved' | 'rejected';
  questionnaireId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

class ResponseService {
  async getResponses(
    page: number = 1,
    limit: number = 10,
    filters: ResponseFilters = {}
  ): Promise<PaginatedResponse<Response>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      ),
    });

    return apiService.authenticatedRequest<Response[]>(
      `/responses?${params.toString()}`
    );
  }

  async getResponse(id: string): Promise<ApiResponse<Response>> {
    return apiService.authenticatedRequest<Response>(`/responses/${id}`);
  }

  async createResponse(
    data: CreateResponseData
  ): Promise<ApiResponse<Response>> {
    return apiService.post<Response>('/responses', data);
  }

  async updateResponse(
    id: string,
    data: Partial<Response>
  ): Promise<ApiResponse<Response>> {
    return apiService.authenticatedRequest<Response>(`/responses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteResponse(id: string): Promise<ApiResponse<void>> {
    return apiService.authenticatedRequest<void>(`/responses/${id}`, {
      method: 'DELETE',
    });
  }

  async reviewResponse(
    id: string,
    status: 'approved' | 'rejected',
    notes?: string
  ): Promise<ApiResponse<Response>> {
    return apiService.authenticatedRequest<Response>(
      `/responses/${id}/review`,
      {
        method: 'PUT',
        body: JSON.stringify({ status, notes }),
      }
    );
  }

  async bulkReview(
    responseIds: string[],
    status: 'approved' | 'rejected',
    notes?: string
  ): Promise<ApiResponse<{ updated: number; failed: string[] }>> {
    return apiService.authenticatedRequest<{ updated: number; failed: string[] }>(
      '/responses/bulk-review',
      {
        method: 'PUT',
        body: JSON.stringify({ responseIds, status, notes }),
      }
    );
  }

  async getResponseAnalytics(
    filters: ResponseFilters = {}
  ): Promise<ApiResponse<ResponseAnalytics>> {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      )
    );

    return apiService.authenticatedRequest<ResponseAnalytics>(
      `/responses/analytics?${params.toString()}`
    );
  }

  async exportResponses(
    format: 'csv' | 'excel' = 'csv',
    filters: ResponseFilters = {}
  ): Promise<ApiResponse<{ downloadUrl: string }>> {
    const params = new URLSearchParams({
      format,
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      ),
    });

    return apiService.authenticatedRequest<{ downloadUrl: string }>(
      `/responses/export?${params.toString()}`,
      { method: 'POST' }
    );
  }

  async getResponsesByQuestionnaire(
    questionnaireId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Response>> {
    return apiService.authenticatedRequest<Response[]>(
      `/questionnaires/${questionnaireId}/responses?page=${page}&limit=${limit}`
    );
  }

  async getResponseAnswers(responseId: string): Promise<ApiResponse<Answer[]>> {
    return apiService.authenticatedRequest<Answer[]>(
      `/responses/${responseId}/answers`
    );
  }

  async flagResponse(
    id: string,
    reason: string
  ): Promise<ApiResponse<Response>> {
    return apiService.authenticatedRequest<Response>(
      `/responses/${id}/flag`,
      {
        method: 'PUT',
        body: JSON.stringify({ reason }),
      }
    );
  }

  async unflagResponse(id: string): Promise<ApiResponse<Response>> {
    return apiService.authenticatedRequest<Response>(
      `/responses/${id}/unflag`,
      { method: 'PUT' }
    );
  }

  async getFlaggedResponses(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Response>> {
    return apiService.authenticatedRequest<Response[]>(
      `/responses/flagged?page=${page}&limit=${limit}`
    );
  }

  // Spam detection and prevention
  async checkSpamLikelihood(
    response: CreateResponseData
  ): Promise<ApiResponse<{ score: number; isSpam: boolean; reasons: string[] }>> {
    return apiService.post<{ score: number; isSpam: boolean; reasons: string[] }>(
      '/responses/check-spam',
      response
    );
  }

  async reportSpam(responseId: string): Promise<ApiResponse<void>> {
    return apiService.authenticatedRequest<void>(
      `/responses/${responseId}/report-spam`,
      { method: 'POST' }
    );
  }

  // Analytics helpers
  async getRatingDistribution(
    questionnaireId?: string
  ): Promise<ApiResponse<{ rating: number; count: number }[]>> {
    const params = questionnaireId
      ? `?questionnaireId=${questionnaireId}`
      : '';
    return apiService.authenticatedRequest<{ rating: number; count: number }[]>(
      `/responses/rating-distribution${params}`
    );
  }

  async getResponseTrends(
    days: number = 30,
    questionnaireId?: string
  ): Promise<ApiResponse<{ date: string; count: number; averageRating: number }[]>> {
    const params = new URLSearchParams({
      days: days.toString(),
      ...(questionnaireId && { questionnaireId }),
    });
    return apiService.authenticatedRequest<
      { date: string; count: number; averageRating: number }[]
    >(`/responses/trends?${params.toString()}`);
  }

  // Validation helpers
  validateResponse(data: CreateResponseData): string[] {
    const errors: string[] = [];

    if (!data.questionnaireId) {
      errors.push('Questionnaire ID is required');
    }

    if (!data.answers || data.answers.length === 0) {
      errors.push('At least one answer is required');
    } else {
      const answerIds = new Set();
      data.answers.forEach((answer, index) => {
        if (!answer.questionId) {
          errors.push(`Answer ${index + 1} question ID is required`);
        }

        if (answerIds.has(answer.questionId)) {
          errors.push(`Duplicate answers for question ${answer.questionId}`);
        }
        answerIds.add(answer.questionId);

        if (answer.value === undefined || answer.value === null) {
          errors.push(`Answer ${index + 1} value is required`);
        }
      });
    }

    return errors;
  }
}

export const responseService = new ResponseService();
export default responseService;