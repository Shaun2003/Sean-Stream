'use client';

import dynamic from 'next/dynamic';

const GamificationWidgetClient = dynamic(() => import('./gamification-widget-client').then(mod => mod.GamificationWidgetClient), { ssr: false });

export function GamificationWidget() {
  return <GamificationWidgetClient />;
}
