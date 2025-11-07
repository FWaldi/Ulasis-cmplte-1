import { setupServer } from 'msw/node';
import { http } from 'msw';
import { 
  createMockUser, 
  createMockQuestionnaire, 
  createMockResponse 
} from './factories';

// Mock JWT token (simple base64 encoded payload)
const createMockJWT = (payload: any) => {
  // Use URL-safe base64 encoding to avoid issues
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const body = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${header}.${body}.mock-signature`;
};

// Mock data storage
let mockUsers = [createMockUser({ id: '1', email: 'admin@example.com', role: 'admin' })];
let mockQuestionnaires = [
  createMockQuestionnaire({ 
    id: '1', 
    title: 'Customer Satisfaction Survey',
    description: 'Measure customer satisfaction with our services'
  }),
  createMockQuestionnaire({ 
    id: '2', 
    title: 'Product Feedback Form',
    description: 'Collect feedback about our products'
  })
];
let mockResponses = [
  createMockResponse({ 
    id: '1', 
    questionnaireId: '1',
    answers: { q1: 5, q2: 'Very satisfied' }
  })
];
let mockAnalytics = {
  totalResponses: 150,
  averageRating: 4.5,
  responseRate: 0.75,
  dailyStats: [
    { date: '2024-01-01', responses: 25, rating: 4.2 },
    { date: '2024-01-02', responses: 30, rating: 4.6 },
    { date: '2024-01-03', responses: 20, rating: 4.4 }
  ]
};

export const handlers = [
  // Auth endpoints (full URLs)
  http.post('http://localhost:3010/api/v1/auth/register', ({ request, params, cookies }) => {
    const mockUser = createMockUser();
    const mockToken = createMockJWT({ userId: mockUser.id, email: mockUser.email });
    return new Response(
      JSON.stringify({
        success: true,
        message: 'User registered successfully',
        data: { user: mockUser, token: mockToken, accessToken: mockToken, refreshToken: mockToken }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.post('http://localhost:3010/api/v1/auth/login', ({ request, params, cookies }) => {
    const mockToken = createMockJWT({ userId: mockUsers[0].id, email: mockUsers[0].email });
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Login successful',
        data: { user: mockUsers[0], accessToken: mockToken, refreshToken: mockToken }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // Auth endpoints (relative URLs for testing)
  http.post('/api/v1/auth/login', ({ request, params, cookies }) => {
    const mockToken = createMockJWT({ userId: mockUsers[0].id, email: mockUsers[0].email });
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Login successful',
        data: { user: mockUsers[0], accessToken: mockToken, refreshToken: mockToken }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.post('http://localhost:3010/api/v1/auth/logout', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({ success: true, message: 'Logout successful' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.get('http://localhost:3010/api/v1/auth/profile', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({
        success: true,
        data: { user: mockUsers[0] }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // Questionnaire endpoints
  http.get('http://localhost:3010/api/v1/questionnaires', ({ request, params, cookies }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { questionnaires: mockQuestionnaires }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.post('http://localhost:3010/api/v1/questionnaires', async ({ request, params, cookies }) => {
    const body = await request.json() as any;
    const newQuestionnaire = createMockQuestionnaire({ 
      id: String(mockQuestionnaires.length + 1),
      title: body.title || 'Test Survey',
      description: body.description || 'Test Description'
    });
    
    // Add to mock data for delete test
    mockQuestionnaires.push(newQuestionnaire);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Questionnaire created successfully',
        data: { questionnaire: newQuestionnaire }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.get('http://localhost:3010/api/v1/questionnaires/:id', ({ params }) => {
    const { id } = params;
    const questionnaire = mockQuestionnaires.find(q => q.id === id);
    
    if (!questionnaire) {
      return new Response(
        JSON.stringify({ success: false, message: 'Questionnaire not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: { questionnaire } }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.put('http://localhost:3010/api/v1/questionnaires/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as any;
    const questionnaire = mockQuestionnaires.find(q => q.id === id);
    
    if (!questionnaire) {
      return new Response(
        JSON.stringify({ success: false, message: 'Questionnaire not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Update the questionnaire with the new data
    const updatedQuestionnaire = {
      ...questionnaire,
      title: body.title || questionnaire.title,
      description: body.description || questionnaire.description
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Questionnaire updated successfully',
        data: { questionnaire: updatedQuestionnaire }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.delete('http://localhost:3010/api/v1/questionnaires/:id', ({ params }) => {
    const { id } = params;
    const index = mockQuestionnaires.findIndex(q => q.id === id);
    
    if (index === -1) {
      return new Response(
        JSON.stringify({ success: false, message: 'Questionnaire not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    mockQuestionnaires.splice(index, 1);
    return new Response(
      JSON.stringify({ success: true, message: 'Questionnaire deleted successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // Response endpoints
  http.get('http://localhost:3010/api/v1/responses', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({
        success: true,
        data: { responses: mockResponses }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.post('http://localhost:3010/api/v1/responses', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Response submitted successfully',
        data: { response: createMockResponse({ id: String(mockResponses.length + 1) }) }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.post('http://localhost:3010/api/v1/responses/anonymous', async ({ request, params, cookies }) => {
    const body = await request.json() as any;
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Anonymous response submitted successfully',
        data: { response: createMockResponse({ 
          id: String(mockResponses.length + 1),
          questionnaireId: body.questionnaireId || '1',
          answers: body.answers || {}
        }) }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.get('http://localhost:3010/api/v1/responses/questionnaire/:questionnaireId', ({ params }) => {
    const { questionnaireId } = params;
    const responses = mockResponses.filter(r => r.questionnaireId === questionnaireId);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: { responses }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // Analytics endpoints
  http.get('http://localhost:3010/api/v1/analytics/overview', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({
        success: true,
        data: mockAnalytics
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.get('http://localhost:3010/api/v1/analytics/questionnaire/:id', ({ params }) => {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...mockAnalytics,
          questionnaireId: params.id
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.get('http://localhost:3010/api/v1/analytics/report/:id', ({ params, request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'csv';
    
    const mockData = format === 'csv' 
      ? 'id,name,email\n1,John Doe,john@example.com'
      : JSON.stringify([{ id: 1, name: 'John Doe', email: 'john@example.com' }]);
    
    const contentType = format === 'csv' 
      ? 'text/csv' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    
    return new Response(mockData, {
      status: 200,
      headers: { 
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="report.${format}"`
      }
    });
  }),

  // Subscription endpoints
  http.get('http://localhost:3010/api/v1/subscription/status', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          plan: 'professional',
          status: 'active',
          expiresAt: '2024-12-31T23:59:59Z',
          features: ['analytics', 'custom_branding', 'export']
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.put('http://localhost:3010/api/v1/subscription', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription updated successfully',
        data: {
          plan: 'professional',
          status: 'active',
          features: ['analytics', 'custom_branding']
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // Notification endpoints
  http.get('http://localhost:3010/api/v1/notifications', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          notifications: [
            {
              id: '1',
              title: 'New response received',
              message: 'Someone responded to your survey',
              read: false,
              createdAt: new Date().toISOString()
            }
          ]
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.put('http://localhost:3010/api/v1/notifications/:id/read', ({ params }) => {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification marked as read'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // QR Code endpoints
  http.get('http://localhost:3010/api/v1/qr-codes', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({
        success: true,
        data: { 
          qrCodes: [
            {
              id: '1',
              name: 'Test QR Code',
              questionnaireId: '1',
              settings: { size: 'medium', style: 'square' },
              createdAt: new Date().toISOString()
            }
          ]
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.post('http://localhost:3010/api/v1/qr-codes', async ({ request, params, cookies }) => {
    const body = await request.json() as any;
    return new Response(
      JSON.stringify({
        id: 'qr-1',
        name: body.name || 'Test QR Code',
        questionnaireId: body.questionnaireId || '1',
        settings: body.settings || { size: 'medium', style: 'square' }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // Admin endpoints
  http.get('http://localhost:3010/api/v1/admin/stats', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          totalUsers: 150,
          totalQuestionnaires: 25,
          totalResponses: 500,
          activeSubscriptions: 75
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.get('http://localhost:3010/api/v1/admin/users', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          users: [
            {
              id: '1',
              email: 'admin@example.com',
              name: 'Admin User',
              role: 'admin',
              createdAt: new Date().toISOString()
            }
          ]
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // Health check endpoint
  http.get('http://localhost:3010/api/v1/health', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({ 
        success: true, 
        status: 'healthy',
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  // Error handlers for testing
  http.get('http://localhost:3010/api/v1/test/error', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.get('/api/v1/test/error', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),

  http.get('http://localhost:3010/api/v1/test/unauthorized', ({ request, params, cookies }) => {
    return new Response(
      JSON.stringify({ success: false, message: 'Unauthorized' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }),
];

export const server = setupServer(...handlers);