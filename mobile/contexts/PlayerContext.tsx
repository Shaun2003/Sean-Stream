import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { Track } from '@/lib/spotify';
import { resolveTrackToYouTube, getCachedVideoId } from '@/lib/youtube';
import { cacheTrackMapping, getCachedYouTubeId, addToHistory, addXP } from '@/lib/offline-storage';

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerContextType {
  // State
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  youtubeVideoId: string | null;

  // Actions
  playTrack: (track: Track, trackQueue?: Track[]) => Promise<void>;
  pause: () => void;
  resume: () => void;
  skipNext: () => void;
  skipPrevious: () => void;
  seekTo: (position: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  onTrackEnd: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const playStartRef = useRef<number>(0);

  const resolveYouTubeId = useCallback(async (track: Track): Promise<string | null> => {
    // Check in-memory cache
    const memCached = getCachedVideoId(track.title, track.artist);
    if (memCached) return memCached;

    // Check SQLite cache
    const dbCached = await getCachedYouTubeId(track.spotifyId);
    if (dbCached) return dbCached;

    // Resolve from YouTube API
    const videoId = await resolveTrackToYouTube(track.title, track.artist);
    if (videoId) {
      await cacheTrackMapping(track.spotifyId, videoId, track.title, track.artist);
    }
    return videoId;
  }, []);

  const playTrack = useCallback(async (track: Track, trackQueue?: Track[]) => {
    setIsLoading(true);
    setProgress(0);
    setDuration(track.duration || 0);

    // Add current track to history
    if (currentTrack) {
      setHistory((prev) => [currentTrack, ...prev.slice(0, 49)]);
      // Record play duration
      const playDuration = Math.floor((Date.now() - playStartRef.current) / 1000);
      if (playDuration > 5) {
        addToHistory(currentTrack, playDuration).catch(console.error);
        addXP(10).catch(console.error);
      }
    }

    setCurrentTrack(track);

    if (trackQueue) {
      const idx = trackQueue.findIndex((t) => t.id === track.id);
      if (idx >= 0) {
        setQueue(trackQueue.slice(idx + 1));
      } else {
        setQueue(trackQueue);
      }
    }

    try {
      const videoId = await resolveYouTubeId(track);
      setYoutubeVideoId(videoId);
      setIsPlaying(!!videoId);
      playStartRef.current = Date.now();
    } catch (error) {
      console.error('Failed to resolve YouTube ID:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentTrack, resolveYouTubeId]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (youtubeVideoId) {
      setIsPlaying(true);
    }
  }, [youtubeVideoId]);

  const skipNext = useCallback(() => {
    if (repeat === 'one' && currentTrack) {
      setProgress(0);
      setIsPlaying(true);
      return;
    }

    if (queue.length > 0) {
      let nextIndex = 0;
      if (shuffle) {
        nextIndex = Math.floor(Math.random() * queue.length);
      }
      const nextTrack = queue[nextIndex];
      const newQueue = [...queue];
      newQueue.splice(nextIndex, 1);
      setQueue(newQueue);
      playTrack(nextTrack);
    } else if (repeat === 'all' && history.length > 0) {
      // Restart from the beginning of history
      const firstTrack = history[history.length - 1];
      if (firstTrack) {
        playTrack(firstTrack);
      }
    } else {
      setIsPlaying(false);
    }
  }, [queue, shuffle, repeat, currentTrack, history, playTrack]);

  const skipPrevious = useCallback(() => {
    if (progress > 3) {
      // Restart current track if past 3 seconds
      setProgress(0);
      return;
    }
    if (history.length > 0) {
      const prevTrack = history[0];
      setHistory((prev) => prev.slice(1));
      if (currentTrack) {
        setQueue((prev) => [currentTrack, ...prev]);
      }
      playTrack(prevTrack);
    }
  }, [progress, history, currentTrack, playTrack]);

  const seekTo = useCallback((position: number) => {
    setProgress(position);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => !s);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat((r) => {
      if (r === 'off') return 'all';
      if (r === 'all') return 'one';
      return 'off';
    });
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => {
      const newQueue = [...prev];
      newQueue.splice(index, 1);
      return newQueue;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const onTrackEnd = useCallback(() => {
    if (currentTrack) {
      const playDuration = Math.floor((Date.now() - playStartRef.current) / 1000);
      if (playDuration > 5) {
        addToHistory(currentTrack, playDuration).catch(console.error);
        addXP(15).catch(console.error);
      }
    }
    skipNext();
  }, [currentTrack, skipNext]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        queue,
        history,
        isPlaying,
        isLoading,
        progress,
        duration,
        volume,
        shuffle,
        repeat,
        youtubeVideoId,
        playTrack,
        pause,
        resume,
        skipNext,
        skipPrevious,
        seekTo,
        setVolume,
        toggleShuffle,
        toggleRepeat,
        addToQueue,
        removeFromQueue,
        clearQueue,
        setProgress,
        setDuration,
        setIsPlaying,
        onTrackEnd,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
