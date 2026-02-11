'use client';

import { useGamification } from '@/contexts/gamification-context';
import { getXPProgress, getLevelFromXP, formatLevel } from '@/lib/gamification';
import { Progress } from '@/components/ui/progress';
import { Trophy } from 'lucide-react';

export function GamificationWidgetClient() {
  const { gamification, loading } = useGamification();

  if (loading || !gamification) {
    return (
        <div className="p-4 bg-card rounded-lg flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary animate-pulse"></div>
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-secondary rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-secondary rounded w-1/2 animate-pulse"></div>
            </div>
        </div>
    );
  }

  const { xp, level } = gamification;
  const progress = getXPProgress(xp, level);
  const currentLevel = getLevelFromXP(xp);
  const levelName = formatLevel(currentLevel);

  return (
    <div className="p-4 bg-card rounded-lg">
      <div className="flex items-center gap-4">
        <div className="relative">
            <Trophy className="w-10 h-10 text-yellow-500" />
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"> 
                {currentLevel}
            </span>
        </div>
        <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">{levelName}</p>
            <p className="text-xs text-muted-foreground">Level {currentLevel}</p>
        </div>
      </div>
      <div className="mt-3">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1 text-right"> {xp} XP </p>
      </div>
    </div>
  );
}
