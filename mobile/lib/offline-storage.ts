import { getDatabase } from './database';
import type { Track } from './spotify';

// --- Liked Tracks ---

export async function likeTrack(track: Track): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO liked_tracks (id, title, artist, artist_id, album, album_id, cover_url, duration, spotify_id, youtube_id, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [track.id, track.title, track.artist, track.artistId ?? null, track.album, track.albumId ?? null, track.coverUrl, track.duration, track.spotifyId, track.youtubeId ?? null]
  );
}

export async function unlikeTrack(trackId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM liked_tracks WHERE id = ?', [trackId]);
}

export async function isTrackLiked(trackId: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM liked_tracks WHERE id = ?',
    [trackId]
  );
  return (result?.count ?? 0) > 0;
}

export async function getLikedTracks(limit = 100, offset = 0): Promise<Track[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM liked_tracks ORDER BY liked_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return rows.map(rowToTrack);
}

export async function getLikedTrackCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM liked_tracks'
  );
  return result?.count ?? 0;
}

// --- Playback History ---

export async function addToHistory(track: Track, playDuration?: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO playback_history (track_id, title, artist, album, cover_url, duration, spotify_id, youtube_id, play_duration, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [track.id, track.title, track.artist, track.album, track.coverUrl, track.duration, track.spotifyId, track.youtubeId ?? null, playDuration ?? 0]
  );

  // Update stats
  await db.runAsync(
    `UPDATE user_stats SET 
      total_plays = total_plays + 1,
      total_listen_time = total_listen_time + ?,
      updated_at = datetime('now')
     WHERE id = 1`,
    [playDuration ?? 0]
  );
}

export async function getPlaybackHistory(limit = 50, offset = 0): Promise<Track[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM playback_history ORDER BY played_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return rows.map(rowToTrack);
}

export async function getRecentlyPlayed(limit = 10): Promise<Track[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT DISTINCT track_id, title, artist, album, cover_url, duration, spotify_id, youtube_id, MAX(played_at) as played_at
     FROM playback_history 
     GROUP BY track_id 
     ORDER BY played_at DESC 
     LIMIT ?`,
    [limit]
  );
  return rows.map(rowToTrack);
}

// --- Search History ---

export async function addSearchHistory(query: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO search_history (query) VALUES (?)',
    [query]
  );
}

export async function getSearchHistory(limit = 20): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ query: string }>(
    'SELECT DISTINCT query FROM search_history ORDER BY searched_at DESC LIMIT ?',
    [limit]
  );
  return rows.map((r) => r.query);
}

export async function clearSearchHistory(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM search_history');
}

// --- Track Cache (Spotify-to-YouTube mapping) ---

export async function cacheTrackMapping(spotifyId: string, youtubeId: string, title: string, artist: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO track_cache (spotify_id, youtube_id, title, artist) VALUES (?, ?, ?, ?)`,
    [spotifyId, youtubeId, title, artist]
  );
}

export async function getCachedYouTubeId(spotifyId: string): Promise<string | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ youtube_id: string }>(
    'SELECT youtube_id FROM track_cache WHERE spotify_id = ?',
    [spotifyId]
  );
  return result?.youtube_id ?? null;
}

// --- User Stats ---

export interface UserStats {
  totalPlays: number;
  totalListenTime: number;
  xp: number;
  level: number;
}

export async function getUserStats(): Promise<UserStats> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM user_stats WHERE id = 1');
  return {
    totalPlays: row?.total_plays ?? 0,
    totalListenTime: row?.total_listen_time ?? 0,
    xp: row?.xp ?? 0,
    level: row?.level ?? 1,
  };
}

export async function addXP(amount: number): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
  const db = await getDatabase();
  const stats = await getUserStats();
  const newXp = stats.xp + amount;
  const newLevel = Math.floor(newXp / 1000) + 1;
  const leveledUp = newLevel > stats.level;

  await db.runAsync(
    `UPDATE user_stats SET xp = ?, level = ?, updated_at = datetime('now') WHERE id = 1`,
    [newXp, newLevel]
  );

  return { newXp, newLevel, leveledUp };
}

// --- Playlists (Local) ---

export async function getLocalPlaylists(): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT *, (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = playlists.id) as track_count FROM playlists ORDER BY updated_at DESC'
  );
}

export async function createLocalPlaylist(id: string, name: string, description?: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO playlists (id, name, description, is_local) VALUES (?, ?, ?, 1)',
    [id, name, description ?? '']
  );
}

export async function addTrackToPlaylist(playlistId: string, track: Track, position: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO playlist_tracks (playlist_id, track_id, title, artist, album, cover_url, duration, spotify_id, youtube_id, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [playlistId, track.id, track.title, track.artist, track.album, track.coverUrl, track.duration, track.spotifyId, track.youtubeId ?? null, position]
  );
  await db.runAsync(
    "UPDATE playlists SET updated_at = datetime('now') WHERE id = ?",
    [playlistId]
  );
}

export async function getPlaylistTracks(playlistId: string): Promise<Track[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC',
    [playlistId]
  );
  return rows.map(rowToTrack);
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?',
    [playlistId, trackId]
  );
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM playlists WHERE id = ?', [playlistId]);
}

// --- Helpers ---

function rowToTrack(row: any): Track {
  return {
    id: row.track_id ?? row.id,
    title: row.title,
    artist: row.artist,
    artistId: row.artist_id ?? undefined,
    album: row.album ?? '',
    albumId: row.album_id ?? undefined,
    coverUrl: row.cover_url ?? '',
    duration: row.duration ?? 0,
    spotifyId: row.spotify_id ?? '',
    youtubeId: row.youtube_id ?? undefined,
  };
}
