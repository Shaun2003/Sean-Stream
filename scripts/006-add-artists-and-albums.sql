-- Create artists table
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create albums table
CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- Use "name" to match the existing schema
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  cover_url TEXT,
  release_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add artist_id and album_id to songs table if they don't exist
ALTER TABLE songs ADD COLUMN IF NOT EXISTS artist_id UUID REFERENCES artists(id) ON DELETE SET NULL;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES albums(id) ON DELETE SET NULL;

-- Populate artists table from existing songs data
INSERT INTO artists (name)
SELECT DISTINCT artist FROM songs WHERE artist IS NOT NULL
ON CONFLICT(name) DO NOTHING;

-- Populate albums table from existing songs data
-- Uses "name" column for album title
INSERT INTO albums (name, artist_id)
SELECT DISTINCT s.album, a.id
FROM songs s
JOIN artists a ON s.artist = a.name
WHERE s.album IS NOT NULL
ON CONFLICT DO NOTHING; -- More robust, though a unique constraint on (name, artist_id) would be better

-- Update songs table with the new artist_id
UPDATE songs s
SET artist_id = a.id
FROM artists a
WHERE s.artist = a.name
AND s.artist_id IS NULL; -- Only update rows that haven't been processed

-- Update songs table with the new album_id
UPDATE songs s
SET album_id = alb.id
FROM albums alb
JOIN artists a ON alb.artist_id = a.id
WHERE s.album = alb.name AND s.artist = a.name -- Match on album.name
AND s.album_id IS NULL; -- Only update rows that haven't been processed

-- The old artist and album columns are NOT dropped automatically for safety.
-- You can run the following manually in the SQL editor after verifying the data.
-- ALTER TABLE songs DROP COLUMN IF EXISTS artist;
-- ALTER TABLE songs DROP COLUMN IF EXISTS album;

-- Add RLS policies for artists and albums
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can view artists') THEN
    CREATE POLICY "Anyone can view artists" ON artists
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can view albums') THEN
    CREATE POLICY "Anyone can view albums" ON albums
      FOR SELECT USING (true);
  END IF;
END;
$$;
