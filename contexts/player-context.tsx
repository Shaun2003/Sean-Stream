"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { YouTubeVideo } from "@/lib/youtube";
import { durationToSeconds } from "@/lib/youtube";
import { addToRecentlyPlayed } from "@/lib/offline-storage";

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          height: string;
          width: string;
          videoId: string;
          playerVars: {
            autoplay: number;
            controls: number;
            disablekb: number;
            enablejsapi: number;
            iv_load_policy: number;
            modestbranding: number;
            rel: number;
            showinfo: number;
            origin: string;
          };
          events: {
            onReady: (event: { target: YTPlayer }) => void;
            onStateChange: (event: { data: number }) => void;
            onError: (event: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  loadVideoById: (videoId: string) => void;
  destroy: () => void;
}

export interface Song extends YouTubeVideo {
  // Extends YouTubeVideo with any additional fields
}

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Song[];
  queueIndex: number;
  isLoading: boolean;
  playSong: (song: Song) => void;
  playQueue: (songs: Song[], startIndex?: number) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);

  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.YT) {
      setIsApiReady(true);
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setIsApiReady(true);
    };

    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, []);

  // Create hidden player container
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!playerContainerRef.current) {
      const container = document.createElement("div");
      container.id = "youtube-player-container";
      container.style.position = "fixed";
      container.style.top = "-9999px";
      container.style.left = "-9999px";
      container.style.width = "1px";
      container.style.height = "1px";
      container.style.overflow = "hidden";
      document.body.appendChild(container);

      const playerDiv = document.createElement("div");
      playerDiv.id = "youtube-player";
      container.appendChild(playerDiv);

      playerContainerRef.current = container;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      if (playerContainerRef.current) {
        playerContainerRef.current.remove();
      }
    };
  }, []);

  // Initialize player when API is ready
  useEffect(() => {
    if (!isApiReady || playerRef.current) return;

    try {
      playerRef.current = new window.YT.Player("youtube-player", {
        height: "1",
        width: "1",
        videoId: "",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(volume);
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setIsLoading(false);
              startTimeUpdate();
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              stopTimeUpdate();
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              stopTimeUpdate();
              handleTrackEnd();
            } else if (event.data === window.YT.PlayerState.BUFFERING) {
              setIsLoading(true);
            }
          },
          onError: (event) => {
            console.error("[v0] YouTube player error:", event.data);
            setIsLoading(false);
            // Skip to next track on error
            handleTrackEnd();
          },
        },
      });
    } catch (error) {
      console.error("[v0] Failed to initialize YouTube player:", error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiReady]);

  const startTimeUpdate = useCallback(() => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
    }

    timeUpdateInterval.current = setInterval(() => {
      if (playerRef.current) {
        const time = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();
        setCurrentTime(time);
        if (dur > 0) setDuration(dur);
      }
    }, 250);
  }, []);

  const stopTimeUpdate = useCallback(() => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
      timeUpdateInterval.current = null;
    }
  }, []);

  const handleTrackEnd = useCallback(() => {
    setQueue((currentQueue) => {
      setQueueIndex((currentIndex) => {
        if (currentQueue.length === 0) return currentIndex;

        const nextIndex = currentIndex + 1;
        if (nextIndex < currentQueue.length) {
          const nextSong = currentQueue[nextIndex];
          setTimeout(() => {
            setCurrentSong(nextSong);
            setCurrentTime(0);
            setDuration(durationToSeconds(nextSong.duration));
            setIsLoading(true);
            if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
              playerRef.current.loadVideoById(nextSong.id);
            }
            addToRecentlyPlayed(nextSong);
          }, 0);
          return nextIndex;
        }
        return currentIndex;
      });
      return currentQueue;
    });
  }, []);

  const playSong = useCallback(
    (song: Song) => {
      setCurrentSong(song);
      setQueue([song]);
      setQueueIndex(0);
      setCurrentTime(0);
      setDuration(durationToSeconds(song.duration));
      setIsLoading(true);

      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById(song.id);
      } else {
        console.warn("[v0] Player not ready yet or loadVideoById not available");
        // Player will load the video once it's ready via the onReady event or retry
      }

      addToRecentlyPlayed(song);
    },
    []
  );

  const playQueue = useCallback(
    (songs: Song[], startIndex = 0) => {
      if (songs.length === 0) return;

      setQueue(songs);
      setQueueIndex(startIndex);
      const song = songs[startIndex];
      setCurrentSong(song);
      setCurrentTime(0);
      setDuration(durationToSeconds(song.duration));
      setIsLoading(true);

      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById(song.id);
      } else {
        console.warn("[v0] Player not ready yet or loadVideoById not available");
      }

      addToRecentlyPlayed(song);
    },
    []
  );

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current || !currentSong) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [currentSong, isPlaying]);

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;

    const nextIndex = queueIndex + 1;
    if (nextIndex < queue.length) {
      setQueueIndex(nextIndex);
      const song = queue[nextIndex];
      setCurrentSong(song);
      setCurrentTime(0);
      setDuration(durationToSeconds(song.duration));
      setIsLoading(true);

      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById(song.id);
      }

      addToRecentlyPlayed(song);
    }
  }, [queue, queueIndex]);

  const previousTrack = useCallback(() => {
    if (queue.length === 0) return;

    // If more than 3 seconds into the song, restart it
    if (currentTime > 3) {
      seek(0);
      return;
    }

    const prevIndex = queueIndex - 1;
    if (prevIndex >= 0) {
      setQueueIndex(prevIndex);
      const song = queue[prevIndex];
      setCurrentSong(song);
      setCurrentTime(0);
      setDuration(durationToSeconds(song.duration));
      setIsLoading(true);

      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById(song.id);
      }

      addToRecentlyPlayed(song);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, queueIndex, currentTime]);

  const seek = useCallback((time: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time, true);
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => [...prev, song]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue(currentSong ? [currentSong] : []);
    setQueueIndex(0);
  }, [currentSong]);

  const shuffleQueue = useCallback(() => {
    setQueue((prev) => {
      if (prev.length <= 1) return prev;
      
      const currentSongItem = prev[queueIndex];
      const otherSongs = prev.filter((_, i) => i !== queueIndex);
      
      // Fisher-Yates shuffle
      for (let i = otherSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]];
      }
      
      return [currentSongItem, ...otherSongs];
    });
    setQueueIndex(0);
  }, [queueIndex]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        queue,
        queueIndex,
        isLoading,
        playSong,
        playQueue,
        togglePlayPause,
        nextTrack,
        previousTrack,
        seek,
        setVolume,
        addToQueue,
        removeFromQueue,
        clearQueue,
        shuffleQueue,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
