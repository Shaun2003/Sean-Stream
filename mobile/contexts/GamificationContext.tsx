import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getGamificationData, addXP as addXPToDb, getUserStats } from '@/lib/offline-storage';

interface GamificationContextType {
  xp: number;
  level: number;
  streak: number;
  achievements: string[];
  addXP: (amount: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType | null>(null);

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await getGamificationData();
      setXp(data.xp);
      setLevel(data.level);
      setStreak(data.streak);
      setAchievements(data.achievements);
    } catch (error) {
      console.error('Error loading gamification:', error);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addXP = useCallback(async (amount: number) => {
    try {
      const result = await addXPToDb(amount);
      setXp(result.newXp);
      setLevel(result.newLevel);
    } catch (error) {
      console.error('Error adding XP:', error);
    }
  }, []);

  return (
    <GamificationContext.Provider value={{ xp, level, streak, achievements, addXP, refresh }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}
