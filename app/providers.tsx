'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { EnhancedPlayerProvider } from '@/contexts/enhanced-player-context';
import { ToastProvider } from '@/hooks/use-toast-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <EnhancedPlayerProvider>
        <ToastProvider>{children}</ToastProvider>
      </EnhancedPlayerProvider>
    </ThemeProvider>
  );
}