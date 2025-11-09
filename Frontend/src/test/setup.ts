import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';
import { 
  createMockUser, 
  createMockQuestionnaire, 
  createMockResponse,
  waitFor 
} from './mocks/factories';

// Setup MSW server
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => {
  server.resetHandlers();
  cleanup();
});

// Clean up after the tests are finished.
afterAll(() => server.close());

// Mock environment variables
process.env.VITE_API_BASE_URL = 'http://localhost:3001/api/v1';
process.env.VITE_APP_NAME = 'Ulasis Customer Intelligence';
process.env.VITE_APP_VERSION = '1.0.0';

// Global test utilities
global.testUtils = {
  createMockUser,
  createMockQuestionnaire,
  createMockResponse,
  waitFor,
};

declare global {
  namespace Vi {
    interface Global {
      testUtils: {
        createMockUser: (overrides?: any) => any;
        createMockQuestionnaire: (overrides?: any) => any;
        createMockResponse: (overrides?: any) => any;
        waitFor: (ms: number) => Promise<void>;
      };
    }
  }
}