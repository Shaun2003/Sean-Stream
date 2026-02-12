import { supabase } from './supabase';
import { getDatabase } from './database';
import type { Track } from './spotify';

/**
 * Sync liked tracks between local SQLite and Supabase.
 * Strategy: merge both - union of local and server liked tracks.
 */
export async function syncLikedTracks(userId: string): Promise<void> {
  try {
    const db = await getDatabase();

    // Pull from server
    const { data: serverLiked, error } = await supabase
      .from('liked_tracks')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to fetch server liked tracks:', error);
      return;
    }

    // Get local unsynced liked tracks
    const localUnsynced = await db.getAllAsync<any>(
      'SELECT * FROM liked_tracks WHERE synced = 0'
    );

    // Push unsynced local tracks to server
    for (const track of localUnsynced) {
      const { error: upsertError } = await supabase.from('liked_tracks').upsert({
        user_id: userId,
        track_id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        cover_url: track.cover_url,
        duration: track.duration,
        spotify_id: track.spotify_id,
        youtube_id: track.youtube_id,
      }, { onConflict: 'user_id,track_id' });

      if (!upsertError) {
        await db.runAsync('UPDATE liked_tracks SET synced = 1 WHERE id = ?', [track.id]);
      }
    }

    // Pull server tracks not in local DB
    if (serverLiked) {
      for (const serverTrack of serverLiked) {
        await db.runAsync(
          `INSERT OR IGNORE INTO liked_tracks (id, title, artist, album, cover_url, duration, spotify_id, youtube_id, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            serverTrack.track_id,
            serverTrack.title,
            serverTrack.artist,
            serverTrack.album ?? '',
            serverTrack.cover_url ?? '',
            serverTrack.duration ?? 0,
            serverTrack.spotify_id ?? '',
            serverTrack.youtube_id ?? '',
          ]
        );
      }
    }
  } catch (e) {
    console.error('syncLikedTracks error:', e);
  }
}

/**
 * Sync playback history to Supabase.
 * Strategy: push unsynced local history to server.
 */
export async function syncPlaybackHistory(userId: string): Promise<void> {
  try {
    const db = await getDatabase();
    const unsynced = await db.getAllAsync<any>(
      'SELECT * FROM playback_history WHERE synced = 0 ORDER BY played_at ASC LIMIT 50'
    );

    for (const entry of unsynced) {
      const { error } = await supabase.from('playback_history').insert({
        user_id: userId,
        track_id: entry.track_id,
        title: entry.title,
        artist: entry.artist,
        album: entry.album,
        cover_url: entry.cover_url,
        duration: entry.duration,
        played_at: entry.played_at,
        play_duration: entry.play_duration,
      });

      if (!error) {
        await db.runAsync(
          'UPDATE playback_history SET synced = 1 WHERE id = ?',
          [entry.id]
        );
      }
    }
  } catch (e) {
    console.error('syncPlaybackHistory error:', e);
  }
}

/**
 * Sync playlists from Supabase to local SQLite.
 * Strategy: server is source of truth for playlists.
 */
export async function syncPlaylists(userId: string): Promise<void> {
  try {
    const db = await getDatabase();

    const { data: serverPlaylists, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !serverPlaylists) {
      console.error('Failed to fetch server playlists:', error);
      return;
    }

    for (const playlist of serverPlaylists) {
      await db.runAsync(
        `INSERT OR REPLACE INTO playlists (id, name, description, cover_url, created_at, updated_at, is_local, synced)
         VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
        [
          playlist.id,
          playlist.name,
          playlist.description ?? '',
          playlist.cover_url ?? '',
          playlist.created_at,
          playlist.updated_at ?? playlist.created_at,
        ]
      );

      // Sync playlist tracks
      const { data: tracks } = await supabase
        .from('playlist_songs')
        .select('*')
        .eq('playlist_id', playlist.id)
        .order('position', { ascending: true });

      if (tracks) {
        // Clear existing tracks for this playlist
        await db.runAsync('DELETE FROM playlist_tracks WHERE playlist_id = ?', [playlist.id]);

        for (const track of tracks) {
          await db.runAsync(
            `INSERT INTO playlist_tracks (playlist_id, track_id, title, artist, album, cover_url, duration, spotify_id, youtube_id, position)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              playlist.id,
              track.track_id ?? track.id,
              track.title,
              track.artist,
              track.album ?? '',
              track.cover_url ?? '',
              track.duration ?? 0,
              track.spotify_id ?? '',
              track.youtube_id ?? '',
              track.position ?? 0,
            ]
          );
        }
      }
    }
  } catch (e) {
    console.error('syncPlaylists error:', e);
  }
}

/**
 * Run all sync operations.
 */
export async function syncAll(userId: string): Promise<void> {
  await Promise.all([
    syncLikedTracks(userId),
    syncPlaybackHistory(userId),
    syncPlaylists(userId),
  ]);
}
