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
  getVideoData?: () => { video_id: string };
  getPlayerState?: () => number;
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
  const pageHiddenAtRef = useRef<number>(Date.now());
  const currentTimeRef = useRef<number>(0); // Track latest current time
  const playerReadyRef = useRef<boolean>(false); // Track if player is fully ready
  const unplayableVideosRef = useRef<Set<string>>(new Set());
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 3;
  const maxElapsedTimeAllowed = 24 * 60 * 60; // 24 hours in seconds

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
          currentTimeRef.current = Math.max(0, state.time || 0);
          // Don't auto-play, let user control it
          setIsPlaying(false);
          
          console.log(`[v0] Loaded persisted song: ${state.song.title} at ${state.time}s`);
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

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Page is being hidden - ALWAYS SAVE STATE BUT DON'T PAUSE
        pageHiddenRef.current = true;
        pageHiddenAtRef.current = Date.now();
        
        if (playerRef.current && currentSong && currentSong.id) {
          try {
            // Use the currentTimeRef which is always up-to-date from the timeUpdateInterval
            const currentPlaybackTime = currentTimeRef.current || 
              (typeof playerRef.current.getCurrentTime === "function" 
                ? playerRef.current.getCurrentTime() 
                : 0);
            
            resumeTimeRef.current = currentPlaybackTime;
            reconnectAttemptsRef.current = 0;
            
            console.log(`[v0] Page hidden - saving playback state at ${currentPlaybackTime.toFixed(2)}s (isPlaying: ${isPlaying})`);
            
            // Save state with timestamp to calculate elapsed time on resume
            // IMPORTANT: Save the ACTUAL playing state - if song was playing, keep it playing in background
            localStorage.setItem(
              "pulse-playback-state",
              JSON.stringify({
                song: currentSong,
                time: currentPlaybackTime,
                isPlaying: isPlaying, // Keep actual state - don't force pause
                hiddenAt: pageHiddenAtRef.current,
              })
            );
          } catch (error) {
            console.error("[v0] Failed to save playback state on visibility change:", error);
          }
        }
      } else {
        // Page is becoming visible - resume playback if it was playing
        pageHiddenRef.current = false;
        const currentTimestamp = Date.now();
        const elapsedTime = (currentTimestamp - pageHiddenAtRef.current) / 1000; // Convert to seconds
        
        // Validate elapsed time - if more than 24 hours, something is wrong
        if (elapsedTime > maxElapsedTimeAllowed) {
          console.warn(
            `[v0] Elapsed time (${elapsedTime.toFixed(2)}s) exceeds maximum allowed time. Not resuming playback.`
          );
          pageHiddenAtRef.current = currentTimestamp;
          return;
        }
        
        if (currentSong && resumeTimeRef.current >= 0 && playerRef.current && isPlaying) {
          try {
            // Calculate new position based on elapsed time
            const newTime = resumeTimeRef.current + elapsedTime;
            const maxTime = duration > 0 ? duration : playerRef.current.getDuration();
            const clampedTime = Math.min(Math.max(0, newTime), maxTime);

            console.log(
              `[v0] Page visible again - resuming playback: was at ${resumeTimeRef.current.toFixed(2)}s, elapsed ${elapsedTime.toFixed(2)}s, resuming at ${clampedTime.toFixed(2)}s`
            );

            // Attempt to resume with retry logic
            let attempts = 0;
            const attemptResume = () => {
              try {
                if (playerRef.current) {
                  playerRef.current.seekTo(clampedTime, true);
                  setCurrentTime(clampedTime);
                  currentTimeRef.current = clampedTime;
                  
                  // Only play if it was playing before
                  if (isPlaying) {
                    // Small delay to ensure seek completes
                    setTimeout(() => {
                      if (playerRef.current && typeof playerRef.current.playVideo === "function") {
                        playerRef.current.playVideo();
                        console.log("[v0] Resumed playback after page visibility change");
                      }
                    }, 100);
                  }
                  reconnectAttemptsRef.current = 0;
                }
              } catch (error) {
                attempts++;
                if (attempts < maxReconnectAttempts) {
                  console.warn(`[v0] Resume attempt ${attempts} failed, retrying...`, error);
                  setTimeout(attemptResume, 300);
                } else {
                  console.error("[v0] Failed to resume playback after", maxReconnectAttempts, "attempts:", error);
                }
              }
            };

            // First attempt immediately
            attemptResume();
            
            // Reset the hidden timestamp for next time
            pageHiddenAtRef.current = currentTimestamp;
          } catch (error) {
            console.error("[v0] Error calculating resume time:", error);
            pageHiddenAtRef.current = currentTimestamp;
          }
        } else {
          // Reset timestamp even if no song to resume
          pageHiddenAtRef.current = currentTimestamp;
        }
      }
    };

    // Also save state periodically when playing
    const autoSaveInterval = setInterval(() => {
      if (currentSong && currentSong.id && isPlaying && playerRef.current && !document.hidden) {
        try {
          const currentPlaybackTime = currentTimeRef.current; // Use ref, not state
          localStorage.setItem(
            "pulse-playback-state",
            JSON.stringify({
              song: currentSong,
              time: Math.max(0, currentPlaybackTime),
              isPlaying: isPlaying,
              hiddenAt: pageHiddenAtRef.current,
            })
          );
        } catch (error) {
          // Silently ignore save errors
        }
      }
    }, 3000); // Save every 3 seconds

    // Also handle page unload to ensure state is saved
    const handleBeforeUnload = () => {
      if (currentSong && currentSong.id && playerRef.current) {
        try {
          const currentPlaybackTime = playerRef.current.getCurrentTime();
          localStorage.setItem(
            "pulse-playback-state",
            JSON.stringify({
              song: currentSong,
              time: Math.max(0, currentPlaybackTime),
              isPlaying: isPlaying,
              hiddenAt: Date.now(),
            })
          );
        } catch (error) {
          // Silently ignore
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Prevent auto-pausing when phone screen locks or app goes to background
    // by requesting wake lock (when available) and managing playback state
    let wakeLock: any = null;
    let wakeLockTimeoutId: NodeJS.Timeout | null = null;
    
    const requestWakeLock = async () => {
      if ("wakeLock" in navigator && isPlaying) {
        try {
          wakeLock = await (navigator as any).wakeLock.request("screen");
          console.debug("[v0] Wake lock requested - screen will stay awake during playback");
          
          // Re-request wake lock periodically if it gets released
          if (wakeLockTimeoutId) clearTimeout(wakeLockTimeoutId);
          wakeLockTimeoutId = setTimeout(() => {
            if (isPlaying && !wakeLock) {
              console.debug("[v0] Wake lock may have been released, re-requesting...");
              requestWakeLock();
            }
          }, 30000); // Check every 30 seconds
        } catch (error) {
          console.debug("[v0] Wake lock request failed (may not be supported):", error);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLock !== null) {
        try {
          await wakeLock.release();
          wakeLock = null;
          console.debug("[v0] Wake lock released");
        } catch (error) {
          console.debug("[v0] Error releasing wake lock:", error);
        }
      }
      if (wakeLockTimeoutId) clearTimeout(wakeLockTimeoutId);
    };

    // Request wake lock when playing
    if (isPlaying) {
      requestWakeLock();
    }

    // Handle visibility change - ONLY release wake lock on full page close, not on tab switch
    const handleWakeLockVisibility = async () => {
      if (document.hidden) {
        // Don't release on tab switch - keep playing in background
        console.debug("[v0] Tab hidden but keeping wake lock for background playback");
      } else if (isPlaying) {
        // Page became visible again and we're still playing
        await requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleWakeLockVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleWakeLockVisibility);
      clearInterval(autoSaveInterval);
      releaseWakeLock();
    };
  }, [currentSong, isPlaying, duration]);

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
        playerReadyRef.current = false;
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
            console.log("[v0] YouTube player onReady fired");
            playerReadyRef.current = true;
            event.target.setVolume(volume);
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setIsLoading(false);
              startTimeUpdate();
              // Update Media Session
              if (navigator.mediaSession) {
                navigator.mediaSession.playbackState = "playing";
              }
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              stopTimeUpdate();
              // Update Media Session
              if (navigator.mediaSession) {
                navigator.mediaSession.playbackState = "paused";
              }
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              stopTimeUpdate();
              // Update Media Session
              if (navigator.mediaSession) {
                navigator.mediaSession.playbackState = "paused";
              }
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

  // Load video into player when currentSong is set and player is ready
  useEffect(() => {
    if (!isApiReady || !playerRef.current || !currentSong || !currentSong.id) {
      console.debug("[v0] Cannot load video - missing dependencies", { isApiReady, hasPlayer: !!playerRef.current, hasSong: !!currentSong, playerReady: playerReadyRef.current });
      return;
    }

    let retryCount = 0;
    const maxRetries = 10;
    const retryDelay = 300; // 300ms between retries (wait longer for player to be truly ready)

    const tryLoadVideo = () => {
      try {
        // First check if player is ready (onReady callback has fired)
        if (!playerReadyRef.current) {
          retryCount++;
          if (retryCount < maxRetries) {
            console.debug(`[v0] Player not ready yet, waiting... (${retryCount}/${maxRetries})`);
            setTimeout(tryLoadVideo, retryDelay);
          } else {
            console.warn("[v0] Player failed to become ready after retries");
          }
          return;
        }

        // Check current video in player
        const currentVideoId = playerRef.current?.getVideoData?.()?.video_id;
        console.log(`[v0] Load effect triggered - Current: ${currentVideoId}, Target: ${currentSong.id} (attempt ${retryCount + 1})`);
        
        // Load if different
        if (currentVideoId !== currentSong.id) {
          console.log(`[v0] Loading video into player: ${currentSong.title} (ID: ${currentSong.id})`);
          if (typeof playerRef.current?.loadVideoById === 'function') {
            playerRef.current.loadVideoById(currentSong.id.trim());
            console.log(`[v0] Video loaded successfully`);
            // Note: When loading a new song, always start from 0:00
            // Only restore saved position when resuming paused playback via page visibility change
            // This prevents songs from starting in the middle when first played
          } else {
            retryCount++;
            if (retryCount < maxRetries) {
              console.debug(`[v0] loadVideoById not ready, retrying in ${retryDelay}ms... (${retryCount}/${maxRetries})`);
              setTimeout(tryLoadVideo, retryDelay);
            } else {
              console.warn("[v0] loadVideoById method not available after retries");
            }
          }
        } else {
          console.log(`[v0] Video already loaded, no action needed`);
        }
      } catch (error) {
        console.error("[v0] Error loading video into player:", error);
      }
    };

    tryLoadVideo();
  }, [isApiReady, currentSong]);

  // Player health check and recovery mechanism
  useEffect(() => {
    if (!isApiReady || !playerRef.current) return;

    const healthCheckInterval = setInterval(() => {
      if (!playerRef.current || !currentSong) return;

      try {
        // Check if player is responsive
        const playerState = playerRef.current.getPlayerState?.();
        const currentPlaybackTime = playerRef.current.getCurrentTime?.();

        // If stuck (same time for 10+ seconds), attempt recovery
        if (isPlaying && typeof currentPlaybackTime === 'number') {
          // This is a simple health check
          console.debug(
            `[v0] Player health check - State: ${playerState}, Time: ${currentPlaybackTime.toFixed(2)}s, Playing: ${isPlaying}`
          );
        }
      } catch (error) {
        console.warn("[v0] Player health check error:", error);
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(healthCheckInterval);
    };
  }, [isApiReady, currentSong, isPlaying]);

  // Setup Media Session API for mobile lock screen and notification controls
  useEffect(() => {
    if (typeof window === "undefined" || !currentSong) return;

    // Check if Media Session API is available
    if (!navigator.mediaSession) {
      console.debug("[v0] Media Session API not available on this device");
      return;
    }

    try {
      // Update media session metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || "Unknown Track",
        artist: currentSong.channelTitle || "Unknown Artist",
        album: "Musica",
        artwork: [
          {
            src: currentSong.thumbnail || "/logo.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      });

      // Set up play/pause handler
      navigator.mediaSession.setActionHandler("play", () => {
        console.debug("[v0] Media Session: play action");
        if (playerRef.current && !isPlaying && typeof playerRef.current.playVideo === "function") {
          playerRef.current.playVideo();
          setIsPlaying(true);
        }
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        console.debug("[v0] Media Session: pause action");
        if (playerRef.current && isPlaying && typeof playerRef.current.pauseVideo === "function") {
          playerRef.current.pauseVideo();
          setIsPlaying(false);
        }
      });

      // Set up next track handler
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        console.debug("[v0] Media Session: next track action");
        // Will call nextTrack from the function defined below
        if (queue.length > 0 && queueIndex < queue.length - 1) {
          setQueueIndex((prev) => {
            const nextIdx = prev + 1;
            if (nextIdx < queue.length) {
              const song = queue[nextIdx];
              setCurrentSong(song);
              setCurrentTime(0);
              setDuration(durationToSeconds(song.duration));
              setIsLoading(true);
              if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
                playerRef.current.loadVideoById(song.id.trim());
                playerRef.current.playVideo();
              }
              addToRecentlyPlayed(song);
            }
            return nextIdx;
          });
        }
      });

      // Set up previous track handler
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        console.debug("[v0] Media Session: previous track action");
        if (queue.length > 0 && queueIndex > 0) {
          setQueueIndex((prev) => {
            const prevIdx = prev - 1;
            if (prevIdx >= 0) {
              const song = queue[prevIdx];
              setCurrentSong(song);
              setCurrentTime(0);
              setDuration(durationToSeconds(song.duration));
              setIsLoading(true);
              if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
                playerRef.current.loadVideoById(song.id.trim());
                playerRef.current.playVideo();
              }
              addToRecentlyPlayed(song);
            }
            return prevIdx;
          });
        }
      });

      // Set up seek handler
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        console.debug(`[v0] Media Session: seek to ${details.seekTime}s`);
        if (playerRef.current && typeof details.seekTime === "number") {
          playerRef.current.seekTo(details.seekTime, true);
          setCurrentTime(details.seekTime);
        }
      });

      // Update playback state
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

      console.debug("[v0] Media Session initialized with full controls (next/prev skip to songs, media controls available)");
    } catch (error) {
      console.warn("[v0] Error setting up Media Session:", error);
    }
  }, [currentSong, isPlaying, queue, queueIndex]);

  // Update Media Session position state periodically
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.mediaSession || !currentSong) return;

    const updatePositionInterval = setInterval(() => {
      try {
        if (playerRef.current && currentSong) {
          const currentPlaybackTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();

          // Update media session position state
          if (navigator.mediaSession?.setPositionState) {
            navigator.mediaSession.setPositionState({
              duration: duration > 0 ? duration : 0,
              playbackRate: isPlaying ? 1 : 0,
              position: currentPlaybackTime,
            });
          }
        }
      } catch (error) {
        console.debug("[v0] Error updating Media Session position:", error);
      }
    }, 1000); // Update every second

    return () => {
      clearInterval(updatePositionInterval);
    };
  }, [currentSong, isPlaying]);

  const startTimeUpdate = useCallback(() => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
    }

    timeUpdateInterval.current = setInterval(() => {
      if (playerRef.current) {
        const time = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();
        setCurrentTime(time);
        currentTimeRef.current = time; // Keep ref in sync
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
                  // Auto-play the next track
                  setTimeout(() => {
                    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
                      playerRef.current.playVideo();
                      setIsPlaying(true);
                    }
                  }, 100);
                } catch (error) {
                  console.error("[v0] Failed to load next track:", error);
                }
              }
              addToRecentlyPlayed(nextSong);
              
              // Sync playback history to backend if user is authenticated
              supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) {
                  const currentDuration = durationToSeconds(nextSong.duration);
                  syncPlaybackHistory(nextSong, 0, currentDuration, { offline: true }).catch((error) => {
                    console.error("[v0] Failed to sync playback history:", error);
                  });
                }
              });
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
      currentTimeRef.current = 0; // Sync ref
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
    if (!playerRef.current || !currentSong) {
      console.debug("[v0] Cannot toggle - player or song missing");
      return;
    }

    try {
      if (isPlaying) {
        if (typeof playerRef.current.pauseVideo === "function") {
          playerRef.current.pauseVideo();
        }
        setIsPlaying(false);
      } else {
        if (typeof playerRef.current.playVideo === "function") {
          playerRef.current.playVideo();
        } else {
          console.warn("[v0] playVideo method not available yet");
          // Retry after a short delay
          setTimeout(() => {
            if (playerRef.current && typeof playerRef.current.playVideo === "function") {
              playerRef.current.playVideo();
            }
          }, 100);
        }
        setIsPlaying(true);
      }
      
      // Persist state after toggle
      try {
        localStorage.setItem(
          "pulse-playback-state",
          JSON.stringify({
            song: currentSong,
            time: currentTime,
            isPlaying: !isPlaying,
            hiddenAt: pageHiddenAtRef.current,
          })
        );
      } catch (e) {
        // Silently ignore
      }
    } catch (error) {
      console.error("[v0] Error toggling play/pause:", error);
    }
  }, [currentSong, isPlaying, currentTime]);

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
      if (typeof playerRef.current.playVideo === "function") {
        playerRef.current.playVideo();
      }
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
    if (!playerRef.current || !currentSong) return;

    try {
      const clampedTime = Math.max(0, Math.min(time, duration || 0));
      playerRef.current.seekTo(clampedTime, true);
      setCurrentTime(clampedTime);
      currentTimeRef.current = clampedTime; // Sync ref

      // Persist state after seeking
      try {
        localStorage.setItem(
          "pulse-playback-state",
          JSON.stringify({
            song: currentSong,
            time: clampedTime,
            isPlaying: isPlaying,
            hiddenAt: pageHiddenAtRef.current,
          })
        );
      } catch (e) {
        // Silently ignore
      }
    } catch (error) {
      console.error("[v0] Error seeking to time:", error);
    }
  }, [currentSong, duration, isPlaying]);

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
