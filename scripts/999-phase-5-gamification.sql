-- ==================================================================================
-- 999-phase-5-gamification.sql
-- ==================================================================================

-- ==================================================================================
-- TABLE: user_gamification
-- ==================================================================================

CREATE TABLE IF NOT EXISTS public.user_gamification (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  xp BIGINT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_listened_date DATE,
  total_tracks_played BIGINT NOT NULL DEFAULT 0,
  total_listening_minutes BIGINT NOT NULL DEFAULT 0,
  total_likes BIGINT NOT NULL DEFAULT 0,
  total_playlists BIGINT NOT NULL DEFAULT 0,
  total_downloads BIGINT NOT NULL DEFAULT 0,
  total_shares BIGINT NOT NULL DEFAULT 0
);

ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual read access to user_gamification" 
ON public.user_gamification 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Allow individual update access to user_gamification" 
ON public.user_gamification 
FOR UPDATE 
USING (auth.uid() = user_id);

-- ==================================================================================
-- TABLE: achievements
-- ==================================================================================

CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  requirement BIGINT NOT NULL
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all users" 
ON public.achievements 
FOR SELECT 
USING (true);

-- ==================================================================================
-- TABLE: user_achievements
-- ==================================================================================

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID REFERENCES auth.users(id),
  achievement_id TEXT REFERENCES public.achievements(id),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual read access to user_achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);
