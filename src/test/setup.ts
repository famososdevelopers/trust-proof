import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { setupServer } from 'msw/node';

import { handlers } from './mocks/supabase/handlers';
import { __resetSupabaseMock } from './mocks/supabase/client';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

vi.mock('sonner', () => {
  const toastFn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  });

  return {
    Toaster: () => null,
    toast: toastFn,
  };
});

vi.mock('@/integrations/supabase/client', () => import('./mocks/supabase/client'));

const server = setupServer(...handlers);

beforeAll(() => server.listen());

afterEach(async () => {
  cleanup();
  server.resetHandlers();
  await __resetSupabaseMock();
});

afterAll(() => server.close());