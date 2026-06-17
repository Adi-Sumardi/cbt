'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { PwaInstallBanner } from '@/components/ui/PwaInstallBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
          <PwaInstallBanner />
        </ToastProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
