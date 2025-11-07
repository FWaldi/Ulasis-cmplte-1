// Mock data factories for testing
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  ...overrides,
});

export const createMockQuestionnaire = (overrides = {}) => ({
  id: 'test-questionnaire-id',
  title: 'Test Questionnaire',
  description: 'Test Description',
  questions: [],
  isActive: true,
  ...overrides,
});

export const createMockResponse = (overrides = {}) => ({
  id: 'test-response-id',
  questionnaireId: 'test-questionnaire-id',
  answers: {},
  submittedAt: new Date().toISOString(),
  ...overrides,
});

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));