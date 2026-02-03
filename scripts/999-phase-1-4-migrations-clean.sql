-- Musica Music App Database Migrations - Phase 1-4
-- Run this script in Supabase SQL Editor
-- This version skips playlist-related features that depend on existing tables

-- ============================================================================
-- PHASE 1: Listening Statistics
-- ============================================================================

CREATE TABLE IF NOT EXISTS listening_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  play_count INTEGER DEFAULT 1,
  total_listening_time INTEGER DEFAULT 0,
  first_played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  liked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_listening_stats_user_id ON listening_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_stats_play_count ON listening_stats(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_listening_stats_last_played ON listening_stats(last_played_at DESC);

-- ============================================================================
-- PHASE 2: Radio Stations & Mood Playlists
-- ============================================================================

CREATE TABLE IF NOT EXISTS radio_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_song_id TEXT NOT NULL,
  base_song_title TEXT NOT NULL,
  base_song_artist TEXT NOT NULL,
  queue_data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radio_stations_user_id ON radio_stations(user_id);
CREATE INDEX IF NOT EXISTS idx_radio_stations_created ON radio_stations(created_at DESC);

CREATE TABLE IF NOT EXISTS mood_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL CHECK (mood IN ('chill', 'workout', 'focus', 'party', 'romantic', 'sad', 'happy')),
  mood_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mood)
);

CREATE INDEX IF NOT EXISTS idx_mood_playlists_user_id ON mood_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_playlists_mood ON mood_playlists(mood);

-- ============================================================================
-- PHASE 3: Social Features
-- ============================================================================

CREATE TABLE IF NOT EXISTS users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  favorite_genres TEXT[],
  is_public BOOLEAN DEFAULT TRUE,
  social_links JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_profile_display_name ON users_profile(display_name);

CREATE TABLE IF NOT EXISTS followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);

CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('liked_track', 'created_playlist', 'followed_user', 'added_to_playlist')),
  activity_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC);

-- ============================================================================
-- PHASE 4: Lyrics, Recommendations & Audio
-- ============================================================================

CREATE TABLE IF NOT EXISTS track_lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  lyrics TEXT,
  lyrics_source TEXT,
  synced_lyrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_track_lyrics_track_id ON track_lyrics(track_id);

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommended_track_id TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  reason TEXT,
  score DECIMAL(3, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_created ON recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_score ON recommendations(score DESC);

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  equalizer_preset TEXT DEFAULT 'normal',
  playback_speed DECIMAL(2, 2) DEFAULT 1.0,
  crossfade_duration INTEGER DEFAULT 0,
  gapless_playback BOOLEAN DEFAULT TRUE,
  audio_quality TEXT DEFAULT 'high',
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE listening_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Listening Stats Policies
CREATE POLICY "Users can view own stats" ON listening_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON listening_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON listening_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Radio Stations Policies
CREATE POLICY "Users can view own stations" ON radio_stations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create stations" ON radio_stations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stations" ON radio_stations
  FOR DELETE USING (auth.uid() = user_id);

-- Mood Playlists Policies
CREATE POLICY "Users can view own mood playlists" ON mood_playlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create mood playlists" ON mood_playlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mood playlists" ON mood_playlists
  FOR UPDATE USING (auth.uid() = user_id);

-- User Profile Policies
CREATE POLICY "Public profiles viewable by all" ON users_profile
  FOR SELECT USING (is_public = TRUE OR auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users_profile
  FOR UPDATE USING (auth.uid() = id);

-- Followers Policies
CREATE POLICY "Anyone can view followers" ON followers
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can follow others" ON followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON followers
  FOR DELETE USING (auth.uid() = follower_id);

-- Activity Feed Policies
CREATE POLICY "Users can view own activity" ON activity_feed
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activity" ON activity_feed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Track Lyrics Policies
CREATE POLICY "Anyone can view lyrics" ON track_lyrics
  FOR SELECT USING (TRUE);

-- Recommendations Policies
CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR SELECT USING (auth.uid() = user_id);

-- User Preferences Policies
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can create preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = id);
