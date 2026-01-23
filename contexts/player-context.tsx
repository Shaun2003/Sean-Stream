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
  const pageHiddenRef = useRef(false);
  const resumeTimeRef = useRef<number>(0);
  const unplayableVideosRef = useRef<Set<string>>(new Set());

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

  // Load persistent playback state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedState = localStorage.getItem("pulse-playback-state");
      if (savedState) {
        const state = JSON.parse(savedState);
        // Validate both the song exists and has a valid YouTube video ID
        if (state.song && state.song.id && isValidYouTubeVideoId(state.song.id)) {
          // Validate the saved song has all required fields
          setCurrentSong(state.song);
          setCurrentTime(Math.max(0, state.time || 0));
          resumeTimeRef.current = Math.max(0, state.time || 0);
          // Don't auto-play, let user control it
          setIsPlaying(false);
        } else {
          // Saved state is invalid, clear it
          console.warn("[v0] Saved playback state has invalid or corrupted song ID:", state.song?.id, "clearing");
          localStorage.removeItem("pulse-playback-state");
        }
      }
    } catch (error) {
      console.error("[v0] Failed to load playback state:", error);
      // Clear invalid saved state
      try {
        localStorage.removeItem("pulse-playback-state");
      } catch (e) {
        // Silently ignore
      }
    }
  }, []);

  // Handle page visibility changes and auto-save state
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pageHiddenRef.current = true;
        if (playerRef.current && currentSong && currentSong.id) {
          try {
            resumeTimeRef.current = playerRef.current.getCurrentTime();
            // Save state to localStorage when page is hidden
            localStorage.setItem(
              "pulse-playback-state",
              JSON.stringify({
                song: currentSong,
                time: resumeTimeRef.current,
                isPlaying: isPlaying,
              })
            );
          } catch (error) {
            console.error("[v0] Failed to save playback state on visibility change:", error);
          }
        }
      } else {
        pageHiddenRef.current = false;
        // Resume playback when page becomes visible
        if (currentSong && resumeTimeRef.current > 0) {
          setTimeout(() => {
            if (playerRef.current) {
              playerRef.current.seekTo(resumeTimeRef.current, true);
              if (isPlaying) {
                playerRef.current.playVideo();
              }
            }
          }, 500);
        }
      }
    };

    // Also save state periodically when playing
    const autoSaveInterval = setInterval(() => {
      if (currentSong && currentSong.id && isPlaying && playerRef.current && !document.hidden) {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          localStorage.setItem(
            "pulse-playback-state",
            JSON.stringify({
              song: currentSong,
              time: Math.max(0, currentTime),
              isPlaying: isPlaying,
            })
          );
        } catch (error) {
          // Silently ignore save errors
        }
      }
    }, 5000); // Save every 5 seconds

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(autoSaveInterval);
    };
  }, [currentSong, isPlaying]);

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
            const errorCode = event.data;
            const videoId = currentSong?.id;
            
            // Add to blocklist of unplayable videos
            if (videoId) {
              unplayableVideosRef.current.add(videoId);
            }
            
            // Log at debug level for error 2 (known YouTube restrictions)
            if (errorCode === 2) {
              console.debug(
                `[v0] Video unavailable: ${videoId} (${currentSong?.title}) - skipping`
              );
            } else {
              console.warn(
                `[v0] YouTube player error ${errorCode}: ${currentSong?.id} (${currentSong?.title})`
              );
            }
            
            setIsLoading(false);
            
            // Skip to next track for any error
            console.debug("[v0] Skipping to next track");
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

        let nextIndex = currentIndex + 1;
        // Skip invalid tracks
        while (nextIndex < currentQueue.length) {
          const nextSong = currentQueue[nextIndex];
          if (nextSong && nextSong.id && typeof nextSong.id === 'string' && isValidYouTubeVideoId(nextSong.id)) {
            // Found a valid track, play it
            setTimeout(() => {
              setCurrentSong(nextSong);
              setCurrentTime(0);
              setDuration(durationToSeconds(nextSong.duration));
              setIsLoading(true);
              if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
                try {
                  playerRef.current.loadVideoById(nextSong.id.trim());
                } catch (error) {
                  console.error("[v0] Failed to load next track:", error);
                }
              }
              addToRecentlyPlayed(nextSong);
            }, 0);
            return nextIndex;
          }
          console.warn("[v0] Skipping invalid track in queue:", nextSong);
          nextIndex++;
        }
        // No more valid tracks
        return currentIndex;
      });
      return currentQueue;
    });
  }, []);

  const playSong = useCallback(
    (song: Song) => {
      // Validate song object and ID format
      if (!song || !song.id || typeof song.id !== 'string') {
        console.error("[v0] Invalid song object or missing video ID:", song);
        setIsLoading(false);
        return;
      }

      // Validate YouTube video ID format (must be exactly 11 chars: [a-zA-Z0-9_-])
      if (!isValidYouTubeVideoId(song.id)) {
        console.error("[v0] Invalid YouTube video ID format. Expected 11 alphanumeric/hyphen/underscore characters, got:", song.id);
        setIsLoading(false);
        return;
      }

      // Check if video is in blocklist of unplayable videos
      if (unplayableVideosRef.current.has(song.id)) {
        console.debug("[v0] Video in blocklist, skipping:", song.id);
        setIsLoading(false);
        handleTrackEnd();
        return;
      }

      setCurrentSong(song);
      setQueue([song]);
      setQueueIndex(0);
      setCurrentTime(0);
      setDuration(durationToSeconds(song.duration));
      setIsLoading(true);

      // Save state to localStorage
      try {
        localStorage.setItem(
          "pulse-playback-state",
          JSON.stringify({
            song: song,
            time: 0,
            isPlaying: true,
          })
        );
      } catch (error) {
        // Silently ignore save errors
      }

      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        try {
          playerRef.current.loadVideoById(song.id.trim());
        } catch (error) {
          console.error("[v0] Failed to load video:", error, "Video ID:", song.id);
          setIsLoading(false);
        }
      } else {
        console.warn("[v0] Player not ready yet or loadVideoById not available");
        // Retry after a delay
        setTimeout(() => {
          if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
            try {
              playerRef.current.loadVideoById(song.id.trim());
            } catch (error) {
              console.error("[v0] Retry failed to load video:", error);
            }
          }
        }, 500);
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
      
      // Validate song object and ID
      if (!song || !song.id || typeof song.id !== 'string' || song.id.trim().length === 0) {
        console.error("[v0] Invalid song in queue:", song);
        setIsLoading(false);
        return;
      }

      setCurrentSong(song);
      setCurrentTime(0);
      setDuration(durationToSeconds(song.duration));
      setIsLoading(true);

      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        try {
          playerRef.current.loadVideoById(song.id.trim());
        } catch (error) {
          console.error("[v0] Failed to load video from queue:", error);
          setIsLoading(false);
        }
      } else {
        console.warn("[v0] Player not ready yet or loadVideoById not available");
        // Retry after a delay
        setTimeout(() => {
          if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
            try {
              playerRef.current.loadVideoById(song.id.trim());
            } catch (error) {
              console.error("[v0] Retry failed to load video from queue:", error);
            }
          }
        }, 500);
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

    let nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      // Loop to beginning
      nextIndex = 0;
    }

    const song = queue[nextIndex];
    
    // Validate video ID
    if (!song || !isValidYouTubeVideoId(song.id)) {
      console.error("[v0] Invalid video ID in next track, skipping:", song?.id);
      return;
    }

    setQueueIndex(nextIndex);
    setCurrentSong(song);
    setCurrentTime(0);
    setDuration(durationToSeconds(song.duration));
    setIsLoading(true);

    if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
      playerRef.current.loadVideoById(song.id);
      playerRef.current.playVideo();
    }

    addToRecentlyPlayed(song);
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
      const song = queue[prevIndex];
      
      // Validate video ID
      if (!song || !isValidYouTubeVideoId(song.id)) {
        console.error("[v0] Invalid video ID in previous track, skipping:", song?.id);
        return;
      }

      setQueueIndex(prevIndex);
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
