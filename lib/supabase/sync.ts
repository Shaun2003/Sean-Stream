import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SyncTrack {
  video_id: string;
  title?: string;
  artist?: string;
  thumbnail?: string;
  duration?: number;
}

export interface PlaybackHistoryEntry extends SyncTrack {
  position_seconds?: number;
  duration_seconds?: number;
}

// Liked tracks sync
export async function addLikedTrack(track: SyncTrack) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('liked_tracks').insert({
    user_id: user.id,
    ...track,
  });

  if (error) throw error;
}

export async function removeLikedTrack(videoId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('liked_tracks')
    .delete()
    .eq('user_id', user.id)
    .eq('video_id', videoId);

  if (error) throw error;
}

export async function getLikedTracks() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('liked_tracks')
    .select('*')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });

  if (error) {
    console.error('Error fetching liked tracks:', error);
    return [];
  }

  return data || [];
}

// Bookmarked tracks sync
export async function addBookmarkedTrack(track: SyncTrack) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('bookmarked_tracks').insert({
    user_id: user.id,
    ...track,
  });

  if (error) throw error;
}

export async function removeBookmarkedTrack(videoId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('bookmarked_tracks')
    .delete()
    .eq('user_id', user.id)
    .eq('video_id', videoId);

  if (error) throw error;
}

export async function getBookmarkedTracks() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('bookmarked_tracks')
    .select('*')
    .eq('user_id', user.id)
    .order('bookmarked_at', { ascending: false });

  if (error) {
    console.error('Error fetching bookmarked tracks:', error);
    return [];
  }

  return data || [];
}

// Playback history sync
export async function addPlaybackHistory(entry: PlaybackHistoryEntry) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('playback_history').insert({
    user_id: user.id,
    ...entry,
  });

  if (error) throw error;
}

export async function getPlaybackHistory(limit = 50) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('playback_history')
    .select('*')
    .eq('user_id', user.id)
    .order('played_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching playback history:', error);
    return [];
  }

  return data || [];
}

// Search history sync
export async function addSearchQuery(query: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('search_history').insert({
    user_id: user.id,
    query,
  });

  if (error) throw error;
}

export async function getSearchHistory(limit = 20) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('search_history')
    .select('query')
    .eq('user_id', user.id)
    .order('searched_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching search history:', error);
    return [];
  }

  return data?.map((item: any) => item.query) || [];
}

// Sync queue (offline-first)
export async function addToSyncQueue(
  operation: string,
  tableName: string,
  videoId: string,
  data?: any
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('sync_queue').insert({
    user_id: user.id,
    operation,
    table_name: tableName,
    video_id: videoId,
    data,
  });

  if (error) throw error;
}

export async function getSyncQueue() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('sync_queue')
    .select('*')
    .eq('user_id', user.id)
    .is('synced_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching sync queue:', error);
    return [];
  }

  return data || [];
}

export async function markSyncQueueItemAsSynced(id: string) {
  const { error } = await supabase
    .from('sync_queue')
    .update({ synced_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// Get all user data for cross-device sync
export async function getAllUserData() {
  const [likedTracks, bookmarkedTracks, playbackHistory, searchHistory] =
    await Promise.all([
      getLikedTracks(),
      getBookmarkedTracks(),
      getPlaybackHistory(100),
      getSearchHistory(50),
    ]);

  return {
    liked_tracks: likedTracks,
    bookmarked_tracks: bookmarkedTracks,
    playback_history: playbackHistory,
    search_history: searchHistory,
  };
}

// User preferences
export async function updateUserPreferences(preferences: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      ...preferences,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function getUserPreferences() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user preferences:', error);
  }

  return data || null;
}

// Playlist operations
export interface PlaylistTrack extends SyncTrack {
  position: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export async function createPlaylist(
  name: string,
  description?: string,
  isPublic: boolean = false
): Promise<Playlist> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('playlists')
    .insert({
      user_id: user.id,
      name,
      description: description || null,
      is_public: isPublic,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlaylist(
  playlistId: string,
  updates: {
    name?: string;
    description?: string;
    cover_url?: string;
    is_public?: boolean;
  }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('playlists')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', playlistId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlaylist(playlistId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function getUserPlaylists(): Promise<Playlist[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching playlists:', error);
    return [];
  }

  return data || [];
}

export async function getPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]> {
  const { data, error } = await supabase
    .from('playlist_songs')
    .select('*')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching playlist tracks:', error);
    return [];
  }

  return data || [];
}

export async function addTrackToPlaylist(
  playlistId: string,
  track: SyncTrack,
  position?: number
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify user owns playlist
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('id')
    .eq('id', playlistId)
    .eq('user_id', user.id)
    .single();

  if (playlistError || !playlist) throw new Error('Playlist not found or access denied');

  // Get current max position
  const { data: tracks } = await supabase
    .from('playlist_songs')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = position ?? ((tracks?.[0]?.position ?? 0) + 1);

  const { error } = await supabase.from('playlist_songs').insert({
    playlist_id: playlistId,
    video_id: track.video_id,
    title: track.title,
    artist: track.artist,
    thumbnail: track.thumbnail,
    duration: track.duration,
    position: nextPosition,
  });

  if (error) throw error;
}

export async function removeTrackFromPlaylist(playlistId: string, videoId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify user owns playlist
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('id')
    .eq('id', playlistId)
    .eq('user_id', user.id)
    .single();

  if (playlistError || !playlist) throw new Error('Playlist not found or access denied');

  const { error } = await supabase
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('video_id', videoId);

  if (error) throw error;
}

export async function reorderPlaylistTracks(
  playlistId: string,
  tracks: Array<{ video_id: string; position: number }>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify user owns playlist
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('id')
    .eq('id', playlistId)
    .eq('user_id', user.id)
    .single();

  if (playlistError || !playlist) throw new Error('Playlist not found or access denied');

  // Update positions
  for (const track of tracks) {
    const { error } = await supabase
      .from('playlist_songs')
      .update({ position: track.position })
      .eq('playlist_id', playlistId)
      .eq('video_id', track.video_id);

    if (error) throw error;
  }
}
