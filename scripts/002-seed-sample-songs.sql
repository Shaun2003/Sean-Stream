-- Insert sample songs for the music app
INSERT INTO songs (title, artist, album, duration, cover_url, genre, release_year) VALUES
  ('Midnight Dreams', 'Luna Nova', 'Starlight Sessions', 234, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop', 'Electronic', 2024),
  ('Electric Soul', 'The Voltage', 'Power Surge', 198, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop', 'Rock', 2024),
  ('Ocean Waves', 'Coastal Vibes', 'Sunset Boulevard', 267, 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop', 'Chill', 2023),
  ('City Lights', 'Urban Echo', 'Metropolitan', 212, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop', 'Pop', 2024),
  ('Forest Walk', 'Nature Sounds', 'Wilderness', 189, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop', 'Ambient', 2023),
  ('Neon Nights', 'Synthwave Masters', 'Retro Future', 245, 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&h=300&fit=crop', 'Synthwave', 2024),
  ('Acoustic Morning', 'Gentle Strings', 'Sunrise Album', 178, 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=300&h=300&fit=crop', 'Acoustic', 2023),
  ('Bass Drop', 'DJ Thunder', 'Club Bangers', 223, 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=300&h=300&fit=crop', 'EDM', 2024),
  ('Jazz Cafe', 'Smooth Quartet', 'Evening Sessions', 312, 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=300&h=300&fit=crop', 'Jazz', 2023),
  ('Hip Hop Flow', 'Street Poets', 'Urban Stories', 195, 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=300&h=300&fit=crop', 'Hip Hop', 2024),
  ('Classical Dreams', 'Symphony Orchestra', 'Timeless', 428, 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=300&h=300&fit=crop', 'Classical', 2022),
  ('Summer Breeze', 'Tropical House', 'Island Vibes', 201, 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=300&h=300&fit=crop', 'Tropical', 2024),
  ('Rock Anthem', 'Thunder Bolt', 'Stadium Nights', 276, 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&h=300&fit=crop', 'Rock', 2023),
  ('Lo-Fi Beats', 'Study Sounds', 'Focus Mode', 167, 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=300&h=300&fit=crop', 'Lo-Fi', 2024),
  ('Dance Floor', 'Party People', 'Weekend Vibes', 234, 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&h=300&fit=crop', 'Dance', 2024),
  ('Piano Sonata', 'Keys Master', 'Ivory Dreams', 356, 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=300&h=300&fit=crop', 'Classical', 2023),
  ('Reggae Sunrise', 'Island Kings', 'Caribbean Soul', 243, 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=300&h=300&fit=crop', 'Reggae', 2024),
  ('Metal Storm', 'Iron Wolves', 'Heavy Thunder', 298, 'https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=300&h=300&fit=crop', 'Metal', 2023),
  ('R&B Groove', 'Velvet Voice', 'Smooth Nights', 219, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=300&fit=crop', 'R&B', 2024),
  ('Country Roads', 'Nashville Stars', 'Heartland', 256, 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=300&h=300&fit=crop', 'Country', 2023)
ON CONFLICT DO NOTHING;
