import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient — created once, provided by main.tsx, imported by write
 * hooks to invalidate list/detail/token caches after any confirmed transaction.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5_000,
    },
  },
});
