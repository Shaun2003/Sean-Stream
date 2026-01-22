-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  streaming_quality TEXT DEFAULT 'high' CHECK (streaming_quality IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create songs table for music metadata
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration INTEGER NOT NULL, -- duration in seconds
  cover_url TEXT,
  audio_url TEXT,
  genre TEXT,
  release_year INTEGER,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playlist_songs junction table
CREATE TABLE IF NOT EXISTS playlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, song_id)
);

-- Create liked_songs table
CREATE TABLE IF NOT EXISTS liked_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  liked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);

-- Create recently_played table
CREATE TABLE IF NOT EXISTS recently_played (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playback_state table for cross-device sync
CREATE TABLE IF NOT EXISTS playback_state (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  position INTEGER DEFAULT 0, -- position in seconds
  is_playing BOOLEAN DEFAULT false,
  shuffle_enabled BOOLEAN DEFAULT false,
  repeat_mode TEXT DEFAULT 'off' CHECK (repeat_mode IN ('off', 'track', 'playlist')),
  volume INTEGER DEFAULT 100,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE liked_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_played ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for songs (everyone can read)
CREATE POLICY "Anyone can view songs" ON songs
  FOR SELECT USING (true);

-- RLS Policies for playlists
CREATE POLICY "Users can view public playlists" ON playlists
  FOR SELECT USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can create their own playlists" ON playlists
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own playlists" ON playlists
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own playlists" ON playlists
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for playlist_songs
CREATE POLICY "Users can view playlist songs" ON playlist_songs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_songs.playlist_id 
      AND (playlists.is_public = true OR playlists.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can add songs to their playlists" ON playlist_songs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_songs.playlist_id 
      AND playlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove songs from their playlists" ON playlist_songs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_songs.playlist_id 
      AND playlists.user_id = auth.uid()
    )
  );

-- RLS Policies for liked_songs
CREATE POLICY "Users can view their liked songs" ON liked_songs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can like songs" ON liked_songs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike songs" ON liked_songs
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for recently_played
CREATE POLICY "Users can view their recently played" ON recently_played
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can add to recently played" ON recently_played
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for playback_state
CREATE POLICY "Users can view their playback state" ON playback_state
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their playback state" ON playback_state
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their playback state" ON playback_state
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO playback_state (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_songs_user_id ON liked_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_recently_played_user_id ON recently_played(user_id);
CREATE INDEX IF NOT EXISTS idx_recently_played_played_at ON recently_played(played_at DESC);
