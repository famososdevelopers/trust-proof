import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';

// Mock de Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        // Simular que no hay sesión
        callback('SIGNED_OUT', null);
        return {
          data: { 
            subscription: { 
              unsubscribe: vi.fn() 
            } 
          }
        };
      }),
      getSession: vi.fn(() => Promise.resolve({ 
        data: { session: null },
        error: null
      }))
    }
  }
}));

// Mock de zustand store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    session: null,
    loading: false,
    initialized: false,
    setSession: vi.fn(),
    setLoading: vi.fn(),
    setInitialized: vi.fn(),
  }))
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('renders the root application structure', () => {
    const { container } = render(<App />);
    expect(container.firstChild).toBeTruthy();
  });
});