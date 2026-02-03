// Backend sync wrapper for player operations
// Syncs playback state, liked tracks, and history with Supabase

import { supabase } from '@/lib/supabase/client';
import { durationToSeconds } from '@/lib/youtube';
import {
  addLikedTrack,
  removeLikedTrack,
  addPlaybackHistory,
  addBookmarkedTrack,
  removeBookmarkedTrack,
} from '@/lib/supabase/sync';
import {
  addToOfflineQueue,
  syncOfflineQueue,
  hasUnsyncedItems,
} from '@/lib/offline-sync-queue';
import type { Song } from '@/contexts/player-context';

interface SyncOptions {
  offline?: boolean;
  skipSync?: boolean;
}

/**
 * Sync liked track with backend
 */
export async function syncLikeTrack(track: Song, options: SyncOptions = {}) {
  if (options.skipSync) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn('User not authenticated, skipping backend sync');
    return;
  }

  try {
    await addLikedTrack({
      video_id: track.id,
      title: track.title,
      artist: track.channelTitle,
      thumbnail: track.thumbnail,
      duration: durationToSeconds(track.duration),
    });
  } catch (error) {
    if (options.offline) {
      // Queue for later sync
      addToOfflineQueue('add_like', 'liked_tracks', {
        video_id: track.id,
        title: track.title,
        artist: track.channelTitle,
        thumbnail: track.thumbnail,
        duration: durationToSeconds(track.duration),
      });
      console.log('Queued like operation for sync');
    } else {
      console.error('Failed to sync like:', error);
    }
  }
}

/**
 * Sync unlike track with backend
 */
export async function syncUnlikeTrack(videoId: string, options: SyncOptions = {}) {
  if (options.skipSync) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn('User not authenticated, skipping backend sync');
    return;
  }

  try {
    await removeLikedTrack(videoId);
  } catch (error) {
    if (options.offline) {
      addToOfflineQueue('remove_like', 'liked_tracks', { video_id: videoId }, videoId);
      console.log('Queued unlike operation for sync');
    } else {
      console.error('Failed to sync unlike:', error);
    }
  }
}

/**
 * Sync bookmark with backend
 */
export async function syncBookmarkTrack(track: Song, options: SyncOptions = {}) {
  if (options.skipSync) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn('User not authenticated, skipping backend sync');
    return;
  }

  try {
    await addBookmarkedTrack({
      video_id: track.id,
      title: track.title,
      artist: track.channelTitle,
      thumbnail: track.thumbnail,
      duration: durationToSeconds(track.duration),
    });
  } catch (error) {
    if (options.offline) {
      addToOfflineQueue('add_bookmark', 'bookmarked_tracks', {
        video_id: track.id,
        title: track.title,
        artist: track.channelTitle,
        thumbnail: track.thumbnail,
        duration: durationToSeconds(track.duration),
      });
      console.log('Queued bookmark operation for sync');
    } else {
      console.error('Failed to sync bookmark:', error);
    }
  }
}

/**
 * Sync unbookmark with backend
 */
export async function syncUnbookmarkTrack(videoId: string, options: SyncOptions = {}) {
  if (options.skipSync) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn('User not authenticated, skipping backend sync');
    return;
  }

  try {
    await removeBookmarkedTrack(videoId);
  } catch (error) {
    if (options.offline) {
      addToOfflineQueue('remove_bookmark', 'bookmarked_tracks', { video_id: videoId }, videoId);
      console.log('Queued unbookmark operation for sync');
    } else {
      console.error('Failed to sync unbookmark:', error);
    }
  }
}

/**
 * Sync playback history with backend
 */
export async function syncPlaybackHistory(
  track: Song,
  position: number,
  duration: number,
  options: SyncOptions = {}
) {
  if (options.skipSync) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn('User not authenticated, skipping backend sync');
    return;
  }

  try {
    await addPlaybackHistory({
      video_id: track.id,
      title: track.title,
      artist: track.channelTitle,
      thumbnail: track.thumbnail,
      position_seconds: position,
      duration_seconds: duration,
    });
  } catch (error) {
    if (options.offline) {
      addToOfflineQueue('add_history', 'playback_history', {
        video_id: track.id,
        title: track.title,
        artist: track.channelTitle,
        thumbnail: track.thumbnail,
        position_seconds: position,
        duration_seconds: duration,
      });
      console.log('Queued playback history for sync');
    } else {
      console.error('Failed to sync playback history:', error);
    }
  }
}

/**
 * Perform offline sync when connection is restored
 */
export async function performOfflineSync(getAuthToken: () => Promise<string>) {
  if (!hasUnsyncedItems()) {
    return { synced: 0, failed: 0 };
  }

  console.log('Starting offline sync...');
  return await syncOfflineQueue(getAuthToken);
}

/**
 * Check if offline sync is needed
 */
export function needsOfflineSync(): boolean {
  return hasUnsyncedItems();
}
