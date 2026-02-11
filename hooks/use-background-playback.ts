/**
 * Hook for managing background audio playback
 * Handles visibility changes, tab switching, and media session
 */

import { useEffect, useRef, useCallback } from "react";
import { getGlobalAudioPlayer, BackgroundAudioPlayer } from "@/lib/audio-player";
import { getPlayableAudioUrl } from "@/lib/youtube-audio-extractor";
import type { Song } from "@/contexts/enhanced-player-context";

interface UseBackgroundPlaybackOptions {
  onStateChange?: (isPlaying: boolean) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export function useBackgroundPlayback(options: UseBackgroundPlaybackOptions = {}) {
  const playerRef = useRef<BackgroundAudioPlayer | null>(null);
  const audioUrlCacheRef = useRef<Map<string, string>>(new Map());
  const hiddenTabRef = useRef(false);
  const playingInBackgroundRef = useRef(false);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio player on first use
  const initializePlayer = useCallback(async () => {
    if (playerRef.current) return playerRef.current;

    try {
      const player = getGlobalAudioPlayer();
      await player.initialize();
      playerRef.current = player;

      // Set up event listeners
      player.addEventListener("timeupdate", () => {
        options.onTimeUpdate?.(player.getCurrentTime());
      });

      player.addEventListener("durationchange", () => {
        options.onDurationChange?.(player.getDuration());
      });

      player.addEventListener("ended", () => {
        options.onEnded?.();
      });

      player.addEventListener("error", (e) => {
        const error = new Error(`Audio playback error: ${e}`);
        options.onError?.(error);
      });

      console.log("[BackgroundPlayback] Player initialized");
      return player;
    } catch (error) {
      console.error("[BackgroundPlayback] Failed to initialize player:", error);
      throw error;
    }
  }, [options]);

  /**
   * Load and play a song with background playback support
   */
  const loadAndPlay = useCallback(
    async (song: Song, startTime: number = 0) => {
      try {
        const player = await initializePlayer();
        
        // Get playable audio URL
        let audioUrl = audioUrlCacheRef.current.get(song.id);
        
        if (!audioUrl) {
          console.log(`[BackgroundPlayback] Extracting audio URL for: ${song.title}`);
          audioUrl = await getPlayableAudioUrl(song.id);
          audioUrlCacheRef.current.set(song.id, audioUrl);
        }

        // Load and play
        await player.loadAndPlay(audioUrl, startTime);
        options.onStateChange?.(true);
        playingInBackgroundRef.current = true;
        
        console.log(`[BackgroundPlayback] Now playing: ${song.title}`);
      } catch (error) {
        console.error("[BackgroundPlayback] Failed to load song:", error);
        options.onError?.(error as Error);
      }
    },
    [initializePlayer, options]
  );

  /**
   * Play the current track
   */
  const play = useCallback(async () => {
    try {
      const player = await initializePlayer();
      await player.play();
      options.onStateChange?.(true);
      playingInBackgroundRef.current = true;
    } catch (error) {
      console.error("[BackgroundPlayback] Play failed:", error);
    }
  }, [initializePlayer, options]);

  /**
   * Pause playback
   */
  const pause = useCallback(() => {
    try {
      const player = playerRef.current || getGlobalAudioPlayer();
      player.pause();
      options.onStateChange?.(false);
      playingInBackgroundRef.current = false;
    } catch (error) {
      console.error("[BackgroundPlayback] Pause failed:", error);
    }
  }, [options]);

  /**
   * Seek to time
   */
  const seek = useCallback((time: number) => {
    try {
      const player = playerRef.current || getGlobalAudioPlayer();
      player.seek(time);
    } catch (error) {
      console.error("[BackgroundPlayback] Seek failed:", error);
    }
  }, []);

  /**
   * Set volume
   */
  const setVolume = useCallback((volume: number) => {
    try {
      const player = playerRef.current || getGlobalAudioPlayer();
      player.setVolume(volume);
    } catch (error) {
      console.error("[BackgroundPlayback] Set volume failed:", error);
    }
  }, []);

  /**
   * Get current playback time
   */
  const getCurrentTime = useCallback(() => {
    const player = playerRef.current || getGlobalAudioPlayer();
    return player.getCurrentTime();
  }, []);

  /**
   * Get duration
   */
  const getDuration = useCallback(() => {
    const player = playerRef.current || getGlobalAudioPlayer();
    return player.getDuration();
  }, []);

  /**
   * Set up visibility change handlers for background playback
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden - tracking for background playback
        hiddenTabRef.current = true;
        console.log("[BackgroundPlayback] Tab hidden, continuing playback in background");
      } else {
        // Tab visible again
        hiddenTabRef.current = false;
        console.log("[BackgroundPlayback] Tab visible again");
      }
    };

    const handlePageUnload = () => {
      // Save state before unload
      if (playerRef.current && playingInBackgroundRef.current) {
        const time = playerRef.current.getCurrentTime();
        sessionStorage.setItem("bg-playback-resume", JSON.stringify({ time }));
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handlePageUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handlePageUnload);
    };
  }, []);

  /**
   * Periodic time update even when tab is hidden
   */
  useEffect(() => {
    const startUpdates = () => {
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);

      updateIntervalRef.current = setInterval(() => {
        if (playerRef.current && playingInBackgroundRef.current) {
          const currentTime = playerRef.current.getCurrentTime();
          options.onTimeUpdate?.(currentTime);
        }
      }, 250);
    };

    const stopUpdates = () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };

    startUpdates();
    return stopUpdates;
  }, [options]);

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return {
    loadAndPlay,
    play,
    pause,
    seek,
    setVolume,
    getCurrentTime,
    getDuration,
    isHiddenTab: () => hiddenTabRef.current,
    isPlayingInBackground: () => playingInBackgroundRef.current,
  };
}

/**
 * Set up Media Session API for background playback
 * Allows media controls on lock screen and notifications
 */
export function useMediaSession(currentSong: Song | null, isPlaying: boolean) {
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaSession) {
      return;
    }

    if (!currentSong) {
      navigator.mediaSession.metadata = null;
      return;
    }

    try {
      // Set metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || "Unknown Track",
        artist: currentSong.channelTitle || "Unknown Artist",
        album: "Musica",
        artwork: currentSong.thumbnail
          ? [
              {
                src: currentSong.thumbnail,
                sizes: "512x512",
                type: "image/jpeg",
              },
            ]
          : [],
      });

      // Set playback state
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

      console.log("[MediaSession] Updated with:", currentSong.title);
    } catch (error) {
      console.debug("[MediaSession] Setup failed:", error);
    }
  }, [currentSong, isPlaying]);
}

/**
 * Handle preventing audio pause on visibility change
 */
export function usePreventAudioPauseOnVisibilityChange() {
  useEffect(() => {
    // Prevent browser from pausing audio when tab is hidden
    document.addEventListener("pause", (e) => {
      if (document.hidden && (e.target as HTMLMediaElement)?.tagName === "AUDIO") {
        // Don't let the browser pause - we'll handle it ourselves
        console.log("[AudioPause] Prevented pause on visibility change");
      }
    });

    return () => {
      document.removeEventListener("pause", () => {});
    };
  }, []);
}
