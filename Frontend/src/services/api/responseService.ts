// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface AnonymousResponseData {
  questionnaireId: number;
  qrCodeId?: number;
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
  success: boolean;
  message: string;
  data?: {
    responseId: number;
    submittedAt: string;
  };
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

export interface DetailedResponse {
  id: number;
  questionnaireId: number;
  questionnaireName: string;
  responses: Array<{
    questionId: string;
    questionText: string;
    questionType: 'short_text' | 'long_text' | 'multiple_choice' | 'dropdown' | 'yes_no' | 'rating_5' | 'rating_10';
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
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
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

export interface ResponsesListResponse {
  success: boolean;
  message: string;
  data: {
    responses: DetailedResponse[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class ResponseService {
  private isDemoMode(): boolean {
    return localStorage.getItem('isDemoMode') === 'true';
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async submitAnonymousResponse(data: AnonymousResponseData): Promise<ResponseSubmission> {
    if (this.isDemoMode()) {
      // Return mock response for demo mode
      return {
        success: true,
        message: 'Demo response submitted successfully',
        data: {
          responseId: Date.now(),
          submittedAt: new Date().toISOString()
        }
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/responses/anonymous`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionnaire_id: data.questionnaireId,
          qr_code_id: data.qrCodeId,
          answers: data.responses,
          device_fingerprint: data.deviceFingerprint,
          user_agent: data.userAgent,
          ip_address: data.ipAddress,
          location: data.location,
        }),
      });

      const responseData = await response.json();

      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to submit response');
      }

      return responseData;
    } catch (error) {
      console.error('Submit anonymous response error:', error);
      throw error;
    }
  }

  async submitManualResponse(data: ManualResponseData): Promise<ResponseSubmission> {
    if (this.isDemoMode()) {
      // Return mock response for demo mode
      return {
        success: true,
        message: 'Manual response submitted successfully',
        data: {
          responseId: Date.now(),
          submittedAt: data.submittedAt || new Date().toISOString()
        }
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/responses/manual`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          questionnaire_id: data.questionnaireId,
          answers: data.responses,
          respondent_info: data.respondentInfo,
          submitted_at: data.submittedAt,
        }),
      });

      const responseData = await response.json();

      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to submit manual response');
      }

      return responseData;
    } catch (error) {
      console.error('Submit manual response error:', error);
      throw error;
    }
  }

  async getResponses(questionnaireId: number, page: number = 1, limit: number = 50): Promise<ResponsesListResponse> {
    if (this.isDemoMode()) {
      // Return mock data for demo mode
      const mockResponses: DetailedResponse[] = [];
      const total = 0;
      
      return {
        success: true,
        message: 'Demo responses retrieved',
        data: {
          responses: mockResponses,
          total,
          page,
          limit,
          hasNext: false,
          hasPrev: false,
        }
      };
    }

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`${API_BASE_URL}/responses/questionnaire/${questionnaireId}?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const responseData = await response.json();

      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to fetch responses');
      }

      return responseData;
    } catch (error) {
      console.error('Get responses error:', error);
      throw error;
    }
  }

  async downloadResponsesCSV(questionnaireId: number): Promise<Blob> {
    if (this.isDemoMode()) {
      // Return mock CSV for demo mode
      const csvContent = 'ID,Questionnaire,Response Date,Source,Respondent Name,Email,Phone,Responses\n';
      return new Blob([csvContent], { type: 'text/csv' });
    }

    try {
      const response = await fetch(`${API_BASE_URL}/responses/csv/${questionnaireId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to download CSV');
      }

      return response.blob();
    } catch (error) {
      console.error('Download CSV error:', error);
      throw error;
    }
  }

  async deleteResponse(responseId: number): Promise<{ success: boolean; message: string }> {
    if (this.isDemoMode()) {
      return {
        success: true,
        message: 'Demo response deleted successfully'
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/responses/${responseId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      const responseData = await response.json();

      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to delete response');
      }

      return responseData;
    } catch (error) {
      console.error('Delete response error:', error);
      throw error;
    }
  }
}

export const responseService = new ResponseService();