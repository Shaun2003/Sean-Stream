'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { UserGamification } from '@/lib/gamification';

interface GamificationContextType {
  gamification: UserGamification | null;
  loading: boolean;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function GamificationProviderClient({ children }: { children: ReactNode }) {
  const [gamification, setGamification] = useState<UserGamification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGamification() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setGamification(data);
      } else if (error && error.code !== 'PGRST116') {
        console.error('Error fetching gamification data:', error);
      }
      setLoading(false);
    }

    fetchGamification();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            fetchGamification();
        } else if (event === 'SIGNED_OUT') {
            setGamification(null);
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <GamificationContext.Provider value={{ gamification, loading }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}
