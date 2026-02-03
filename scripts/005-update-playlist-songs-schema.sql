-- Migration: Add missing columns to playlist_songs table for storing track metadata
-- This allows playlists to store track info without requiring a separate songs table

ALTER TABLE playlist_songs
ADD COLUMN IF NOT EXISTS video_id TEXT UNIQUE NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS artist TEXT,
ADD COLUMN IF NOT EXISTS thumbnail TEXT,
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS title TEXT;

-- Update the UNIQUE constraint to use video_id and playlist_id instead of song_id
-- First, drop the old constraint if it exists
ALTER TABLE playlist_songs
DROP CONSTRAINT IF EXISTS playlist_songs_playlist_id_song_id_key;

-- Add new constraint on playlist_id and video_id
ALTER TABLE playlist_songs
ADD CONSTRAINT playlist_songs_playlist_id_video_id_key UNIQUE (playlist_id, video_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_playlist_songs_video_id ON playlist_songs(video_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);

-- Optional: Remove the song_id column if you want to clean up the schema
-- ALTER TABLE playlist_songs DROP COLUMN IF EXISTS song_id;
