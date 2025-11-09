import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import { createTestQueryClient } from './queryClient';

interface ProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  initialEntries?: string[];
  queryClient?: QueryClient;
}

export const renderWithProviders = (
  ui: ReactElement,
  { route = '/', initialEntries, queryClient: providedClient, ...renderOptions }: ProvidersOptions = {}
) => {
  const queryClient = providedClient ?? createTestQueryClient();
  const entries = initialEntries ?? [route];

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={entries}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};


