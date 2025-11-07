import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Provide Jest-compatible globals for existing tests
global.jest = {
  mock: vi.mock,
  spyOn: vi.spyOn,
  fn: vi.fn,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
  mockImplementation: vi.fn,
  mockReturnValue: vi.fn,
  mockResolvedValue: vi.fn,
  mockRejectedValue: vi.fn,
};