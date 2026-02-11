/**
 * Enhanced Player Context with true background playback support
 * 
 * This fixes the issue where music stops when switching tabs/apps
 * by using proper Media Session API and visibility change handling
 */

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
import { durationToSeconds, isValidYouTubeVideoId } from "@/lib/youtube";
import { addToRecentlyPlayed } from "@/lib/offline-storage";
import { supabase } from "@/lib/supabase/client";
import { syncPlaybackHistory } from "@/lib/backend-sync";

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: any
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
  getVideoData?: () => { video_id: string };
  getPlayerState?: () => number;
  mute: () => void;
  unMute: () => void;
}

export interface Song extends YouTubeVideo {}

interface EnhancedPlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  isPlayingInBackground: boolean;
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

const EnhancedPlayerContext = createContext<EnhancedPlayerContextType | undefined>(undefined);

export function EnhancedPlayerProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingInBackground, setIsPlayingInBackground] = useState(false);
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
  const pageHiddenRef = useRef(false);
  const currentTimeRef = useRef<number>(0);
  const playerReadyRef = useRef<boolean>(false);
  const backgroundKeepAliveRef = useRef<NodeJS.Timeout | null>(null);
  const lastKnownPlayingStateRef = useRef<boolean>(false);
  const tabVisibilityChangeRef = useRef<number>(Date.now());

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
  }, []);

  // Load persistent playback state
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedState = localStorage.getItem("enhanced-playback-state");
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.song && state.song.id && isValidYouTubeVideoId(state.song.id)) {
          setCurrentSong(state.song);
          setCurrentTime(Math.max(0, state.time || 0));
          setIsPlaying(false);
          console.log(`[EnhancedPlayer] Loaded: ${state.song.title} at ${state.time}s`);
        }
      }
    } catch (error) {
      console.error("[EnhancedPlayer] Failed to load saved state:", error);
    }
  }, []);

  // CRITICAL: Handle page visibility changes and background playback
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      const now = Date.now();
      tabVisibilityChangeRef.current = now;

      if (document.hidden) {
        // TAB IS HIDDEN - KEEP PLAYER STATE ACTIVE
        pageHiddenRef.current = true;
        lastKnownPlayingStateRef.current = isPlaying;
        setIsPlayingInBackground(isPlaying);

        console.log("[EnhancedPlayer] Tab hidden - maintaining playback state");

        // Save state immediately
        if (currentSong) {
          try {
            localStorage.setItem(
              "enhanced-playback-state",
              JSON.stringify({
                song: currentSong,
                time: currentTimeRef.current,
                isPlaying: isPlaying,
                hiddenAt: now,
              })
            );
          } catch (e) {
            console.debug("[EnhancedPlayer] State save failed");
          }
        }

        // Start keep-alive mechanism to prevent browser throttling
        if (backgroundKeepAliveRef.current) {
          clearInterval(backgroundKeepAliveRef.current);
        }

        backgroundKeepAliveRef.current = setInterval(() => {
          if (document.hidden && playerRef.current && lastKnownPlayingStateRef.current) {
            try {
              // Keep player active by reading state
              const playerState = playerRef.current.getPlayerState?.();
              const currentPlayback = playerRef.current.getCurrentTime?.();

              // If not playing but should be, resume
              if (
                playerState !== window.YT.PlayerState.PLAYING &&
                playerState !== window.YT.PlayerState.BUFFERING &&
                lastKnownPlayingStateRef.current
              ) {
                console.log("[EnhancedPlayer] Resuming background playback");
                playerRef.current.playVideo();
              }

              console.debug(
                `[EnhancedPlayer] Background check - State: ${playerState}, Time: ${currentPlayback?.toFixed(2)}s`
              );
            } catch (error) {
              console.debug("[EnhancedPlayer] Background keep-alive check failed:", error);
            }
          }
        }, 1000); // Check every second in background

      } else {
        // TAB IS VISIBLE AGAIN
        pageHiddenRef.current = false;

        if (backgroundKeepAliveRef.current) {
          clearInterval(backgroundKeepAliveRef.current);
          backgroundKeepAliveRef.current = null;
        }

        // Resume playback if it was playing in background
        if (lastKnownPlayingStateRef.current && playerRef.current && currentSong) {
          console.log("[EnhancedPlayer] Tab visible - resuming from background");
          setTimeout(() => {
            if (playerRef.current && typeof playerRef.current.playVideo === "function") {
              try {
                playerRef.current.playVideo();
                setIsPlaying(true);
              } catch (error) {
                console.warn("[EnhancedPlayer] Failed to resume:", error);
              }
            }
          }, 100);
        }

        setIsPlayingInBackground(false);
      }
    };

    // Set up event listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Handle unload
    const handleBeforeUnload = () => {
      if (currentSong && playerRef.current) {
        try {
          const time = playerRef.current.getCurrentTime();
          localStorage.setItem(
            "enhanced-playback-state",
            JSON.stringify({
              song: currentSong,
              time: Math.max(0, time),
              isPlaying: isPlaying,
            })
          );
        } catch (e) {
          // Ignore
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (backgroundKeepAliveRef.current) {
        clearInterval(backgroundKeepAliveRef.current);
      }
    };
  }, [currentSong, isPlaying]);

  // Auto-save playback state every 2 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (currentSong && isPlaying && !document.hidden) {
        try {
          localStorage.setItem(
            "enhanced-playback-state",
            JSON.stringify({
              song: currentSong,
              time: Math.max(0, currentTimeRef.current),
              isPlaying: isPlaying,
            })
          );
        } catch (e) {
          // Ignore
        }
      }
    }, 2000);

    return () => clearInterval(autoSaveInterval);
  }, [currentSong, isPlaying]);

  // Create hidden player container
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!playerContainerRef.current) {
      const container = document.createElement("div");
      container.id = "enhanced-youtube-player-container";
      container.style.position = "fixed";
      container.style.top = "-9999px";
      container.style.left = "-9999px";
      container.style.width = "1px";
      container.style.height = "1px";
      container.style.overflow = "hidden";
      container.style.pointerEvents = "none";
      document.body.appendChild(container);

      const playerDiv = document.createElement("div");
      playerDiv.id = "enhanced-youtube-player";
      container.appendChild(playerDiv);

      playerContainerRef.current = container;
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore
        }
        playerReadyRef.current = false;
      }
      if (playerContainerRef.current) {
        playerContainerRef.current.remove();
      }
    };
  }, []);

  // Initialize YouTube player
  useEffect(() => {
    if (!isApiReady || playerRef.current) return;

    try {
      playerRef.current = new window.YT.Player("enhanced-youtube-player", {
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
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: (event) => {
            console.log("[EnhancedPlayer] YouTube player ready");
            playerReadyRef.current = true;
            event.target.setVolume(volume);
          },
          onStateChange: (event) => {
            const playerState = event.data;
            console.log(`[EnhancedPlayer] Player state changed: ${playerState}`);

            // Auto-play when video is cued (state 5)
            if (playerState === 5) {
              console.log("[EnhancedPlayer] Video CUED - auto-playing");
              try {
                if (playerRef.current && typeof playerRef.current.playVideo === "function") {
                  playerRef.current.playVideo();
                  console.log("[EnhancedPlayer] Auto-play triggered");
                }
              } catch (e) {
                console.error("[EnhancedPlayer] Auto-play failed:", e);
              }
            } else if (playerState === window.YT.PlayerState.PLAYING) {
              console.log("[EnhancedPlayer] Now PLAYING");
              setIsPlaying(true);
              lastKnownPlayingStateRef.current = true;
              setIsLoading(false);
              startTimeUpdate();
            } else if (playerState === window.YT.PlayerState.PAUSED) {
              console.log("[EnhancedPlayer] Now PAUSED");
              setIsPlaying(false);
              lastKnownPlayingStateRef.current = false;
              stopTimeUpdate();
            } else if (playerState === window.YT.PlayerState.ENDED) {
              console.log("[EnhancedPlayer] Video ENDED");
              setIsPlaying(false);
              lastKnownPlayingStateRef.current = false;
              stopTimeUpdate();
              handleTrackEnd();
            } else if (playerState === window.YT.PlayerState.BUFFERING) {
              console.log("[EnhancedPlayer] BUFFERING");
              setIsLoading(true);
            }

            // Update Media Session
            updateMediaSession(playerState);
          },
          onError: (event) => {
            console.warn("[EnhancedPlayer] YouTube error:", event.data);
            setIsLoading(false);
            handleTrackEnd();
          },
        },
      });
    } catch (error) {
      console.error("[EnhancedPlayer] Failed to initialize:", error);
    }
  }, [isApiReady, volume]);

  // Load video when song changes
  useEffect(() => {
    if (!isApiReady || !playerRef.current || !currentSong) {
      return;
    }

    const tryLoadVideo = () => {
      try {
        if (!playerReadyRef.current) {
          setTimeout(tryLoadVideo, 300);
          return;
        }

        const currentVideoId = playerRef.current?.getVideoData?.()?.video_id;
        if (currentVideoId !== currentSong.id) {
          console.log(`[EnhancedPlayer] Loading: ${currentSong.title}`);
          playerRef.current?.loadVideoById(currentSong.id.trim());
        }
      } catch (error) {
        console.error("[EnhancedPlayer] Load failed:", error);
      }
    };

    tryLoadVideo();
  }, [isApiReady, currentSong]);

  // Update Media Session API
  const updateMediaSession = (playerState?: number) => {
    if (typeof navigator === "undefined" || !navigator.mediaSession || !currentSong) {
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || "Unknown",
        artist: currentSong.channelTitle || "Unknown",
        album: "Musica",
        artwork: currentSong.thumbnail
          ? [{ src: currentSong.thumbnail, sizes: "512x512", type: "image/jpeg" }]
          : [],
      });

      const state =
        playerState === window.YT.PlayerState.PLAYING ? "playing" : "paused";
      navigator.mediaSession.playbackState = state as MediaSessionPlaybackState;

      // Handle media controls
      navigator.mediaSession.setActionHandler("play", () => {
        if (playerRef.current) {
          playerRef.current.playVideo();
          setIsPlaying(true);
        }
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        if (playerRef.current) {
          playerRef.current.pauseVideo();
          setIsPlaying(false);
        }
      });

      navigator.mediaSession.setActionHandler("nexttrack", () => {
        nextTrack();
      });

      navigator.mediaSession.setActionHandler("previoustrack", () => {
        previousTrack();
      });

      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (playerRef.current && details.seekTime) {
          playerRef.current.seekTo(details.seekTime, true);
          setCurrentTime(details.seekTime);
        }
      });
    } catch (error) {
      console.debug("[EnhancedPlayer] Media Session update failed:", error);
    }
  };

  // Update Media Session on changes
  useEffect(() => {
    updateMediaSession();
  }, [currentSong, isPlaying]);

  const startTimeUpdate = useCallback(() => {
    if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current);

    timeUpdateInterval.current = setInterval(() => {
      if (playerRef.current) {
        try {
          const time = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          setCurrentTime(time);
          currentTimeRef.current = time;
          if (dur > 0) setDuration(dur);
        } catch (error) {
          // Ignore interval errors
        }
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
    if (queue.length > 0 && queueIndex < queue.length - 1) {
      const nextSong = queue[queueIndex + 1];
      setQueueIndex(queueIndex + 1);
      setCurrentSong(nextSong);
      setCurrentTime(0);
      setDuration(durationToSeconds(nextSong.duration));
      setIsLoading(true);

      if (playerRef.current) {
        playerRef.current.loadVideoById(nextSong.id);
        playerRef.current.playVideo();
      }

      addToRecentlyPlayed(nextSong);
    }
  }, [queue, queueIndex]);

  const playSong = useCallback((song: Song) => {
    if (!song || !song.id || !isValidYouTubeVideoId(song.id)) return;

    console.log(`[EnhancedPlayer] playSong called for: ${song.title}`);
    setCurrentSong(song);
    setQueue([song]);
    setQueueIndex(0);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setDuration(durationToSeconds(song.duration));
    setIsLoading(true);
    lastKnownPlayingStateRef.current = true;

    // Schedule loading in next tick to ensure player is ready
    setTimeout(() => {
      if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
        try {
          console.log(`[EnhancedPlayer] loadVideoById: ${song.id}`);
          playerRef.current.loadVideoById(song.id.trim());
          console.log(`[EnhancedPlayer] Video queued, waiting for CUED state to auto-play`);
        } catch (error) {
          console.error("[EnhancedPlayer] Failed to load video:", error);
        }
      } else {
        console.warn("[EnhancedPlayer] Player not ready for loading");
      }
    }, 0);

    addToRecentlyPlayed(song);
  }, []);

  const playQueue = useCallback((songs: Song[], startIndex = 0) => {
    if (songs.length === 0) return;

    console.log(`[EnhancedPlayer] playQueue called with ${songs.length} songs, starting at index ${startIndex}`);
    setQueue(songs);
    setQueueIndex(startIndex);
    const song = songs[startIndex];

    if (!song || !song.id) return;

    setCurrentSong(song);
    setCurrentTime(0);
    setDuration(durationToSeconds(song.duration));
    setIsLoading(true);
    lastKnownPlayingStateRef.current = true;

    // Schedule loading in next tick to ensure player is ready
    setTimeout(() => {
      if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
        try {
          console.log(`[EnhancedPlayer] loadVideoById: ${song.id}`);
          playerRef.current.loadVideoById(song.id.trim());
          console.log(`[EnhancedPlayer] Video queued, waiting for CUED state to auto-play`);
        } catch (error) {
          console.error("[EnhancedPlayer] Failed to load video:", error);
        }
      } else {
        console.warn("[EnhancedPlayer] Player not ready for loading");
      }
    }, 0);

    addToRecentlyPlayed(song);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current || !currentSong) return;

    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
        lastKnownPlayingStateRef.current = false;
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
        lastKnownPlayingStateRef.current = true;
      }
    } catch (error) {
      console.error("[EnhancedPlayer] Toggle failed:", error);
    }
  }, [currentSong, isPlaying]);

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;

    let nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) nextIndex = 0;

    const song = queue[nextIndex];
    if (!song) return;

    setQueueIndex(nextIndex);
    setCurrentSong(song);
    setCurrentTime(0);
    setDuration(durationToSeconds(song.duration));
    setIsLoading(true);

    if (playerRef.current) {
      playerRef.current.loadVideoById(song.id);
      playerRef.current.playVideo();
    }

    addToRecentlyPlayed(song);
  }, [queue, queueIndex]);

  const previousTrack = useCallback(() => {
    if (queue.length === 0) return;

    if (currentTime > 3) {
      seek(0);
      return;
    }

    const prevIndex = queueIndex - 1;
    if (prevIndex >= 0) {
      const song = queue[prevIndex];
      setQueueIndex(prevIndex);
      setCurrentSong(song);
      setCurrentTime(0);
      setDuration(durationToSeconds(song.duration));
      setIsLoading(true);

      if (playerRef.current) {
        playerRef.current.loadVideoById(song.id);
      }

      addToRecentlyPlayed(song);
    }
  }, [queue, queueIndex, currentTime]);

  const seek = useCallback((time: number) => {
    if (!playerRef.current) return;

    const clampedTime = Math.max(0, Math.min(time, duration || 0));
    playerRef.current.seekTo(clampedTime, true);
    setCurrentTime(clampedTime);
    currentTimeRef.current = clampedTime;
  }, [duration]);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (playerRef.current) {
      playerRef.current.setVolume(vol);
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

      const current = prev[queueIndex];
      const others = prev.filter((_, i) => i !== queueIndex);

      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }

      return [current, ...others];
    });
    setQueueIndex(0);
  }, [queueIndex]);

  return (
    <EnhancedPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        isPlayingInBackground,
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
    </EnhancedPlayerContext.Provider>
  );
}

export function useEnhancedPlayer() {
  const context = useContext(EnhancedPlayerContext);
  if (context === undefined) {
    throw new Error("useEnhancedPlayer must be used within EnhancedPlayerProvider");
  }
  return context;
}
