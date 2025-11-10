import { QueryClient } from '@tanstack/react-query';

import { __setMockQueryClient } from '@/integrations/supabase/client';

export const createTestQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  __setMockQueryClient(queryClient);

  return queryClient;
};


