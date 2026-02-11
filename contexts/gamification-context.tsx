'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const GamificationProviderClient = dynamic(() => import('./gamification-context-client').then(mod => mod.GamificationProviderClient), { ssr: false });

export function GamificationProvider({ children }: { children: ReactNode }) {
  return <GamificationProviderClient>{children}</GamificationProviderClient>;
}

export { useGamification } from './gamification-context-client';
