-- Migration: 004-supabase-cross-device-sync.sql
-- Purpose: Create tables for cross-device sync functionality
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Liked tracks table (cross-device)
CREATE TABLE IF NOT EXISTS liked_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  thumbnail TEXT,
  duration INT,
  added_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_liked_user_id ON liked_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_video_id ON liked_tracks(video_id);

-- Recently played tracks (sync history)
CREATE TABLE IF NOT EXISTS playback_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  thumbnail TEXT,
  played_at TIMESTAMP DEFAULT now(),
  position_seconds INT DEFAULT 0,
  duration_seconds INT
);

CREATE INDEX IF NOT EXISTS idx_history_user_id ON playback_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_played_at ON playback_history(played_at DESC);

-- Bookmarked/downloaded tracks
CREATE TABLE IF NOT EXISTS bookmarked_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  thumbnail TEXT,
  duration INT,
  bookmarked_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarked_user_id ON bookmarked_tracks(user_id);

-- Search history
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  searched_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_searched_at ON search_history(searched_at DESC);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  theme TEXT DEFAULT 'dark',
  language TEXT DEFAULT 'en',
  volume FLOAT DEFAULT 0.8,
  shuffle_enabled BOOLEAN DEFAULT FALSE,
  repeat_mode TEXT DEFAULT 'off',
  updated_at TIMESTAMP DEFAULT now()
);

-- Sync queue for offline-first approach
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  operation TEXT NOT NULL,
  table_name TEXT NOT NULL,
  video_id TEXT,
  data JSONB,
  created_at TIMESTAMP DEFAULT now(),
  synced_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_synced_at ON sync_queue(synced_at) WHERE synced_at IS NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE liked_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarked_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for liked_tracks
CREATE POLICY "Users can view their own liked tracks"
  ON liked_tracks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own liked tracks"
  ON liked_tracks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own liked tracks"
  ON liked_tracks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for playback_history
CREATE POLICY "Users can view their own playback history"
  ON playback_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playback history"
  ON playback_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for bookmarked_tracks
CREATE POLICY "Users can view their own bookmarked tracks"
  ON bookmarked_tracks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarked tracks"
  ON bookmarked_tracks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarked tracks"
  ON bookmarked_tracks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for search_history
CREATE POLICY "Users can view their own search history"
  ON search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history"
  ON search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for sync_queue
CREATE POLICY "Users can view their own sync queue"
  ON sync_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync queue items"
  ON sync_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);
