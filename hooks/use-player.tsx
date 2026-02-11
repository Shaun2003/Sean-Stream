'use client';

import { createContext, useContext } from 'react';
import type { YouTubeVideo } from '@/lib/youtube';

export interface Song extends YouTubeVideo {}

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Song[];
  queueIndex: number;
  isLoading: boolean;
  playSong: (song: Song, songs?: Song[]) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
}

export const PlayerContext = createContext<PlayerContextType | undefined>(
  undefined
);

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
