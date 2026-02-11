/**
 * Mobile-specific hook for true background audio playback
 * Handles switching between YouTube player and HTML5 audio for uninterrupted playback
 * when tabs switch, app is minimized, or screen is locked
 */

import { useEffect, useRef, useCallback } from "react";
import { getBackgroundAudioManager } from "@/lib/background-audio-manager";
import { getPlayableAudioUrl } from "@/lib/youtube-audio-extractor";
import type { Song } from "@/contexts/enhanced-player-context";

interface UseMobileBackgroundPlaybackOptions {
  isPlaying: boolean;
  currentSong: Song | null;
  currentYouTubeTime: number;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export function useMobileBackgroundPlayback({
  isPlaying,
  currentSong,
  currentYouTubeTime,
  onTimeUpdate,
  onEnded,
  onError,
}: UseMobileBackgroundPlaybackOptions) {
  const backgroundAudioRef = useRef(getBackgroundAudioManager());
  const backgroundModeRef = useRef(false);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);
  const audioUrlRef = useRef<string>("");
  const audioLoadAttemptRef = useRef<number>(0);
  const maxAudioLoadAttempts = 3;

  // Initialize background audio on mount
  useEffect(() => {
    backgroundAudioRef.current
      .initialize()
      .catch((e) => console.error("[MobileBackgroundPlayback] Init error:", e));
  }, []);

  // Handle visibility changes and page hide - switch to background audio when hidden
  useEffect(() => {
    if (!currentSong) return;

    const switchToBackgroundAudio = async () => {
      if (!currentSong || !isPlaying) {
        console.log("[MobileBackgroundPlayback] Not switching - no song or not playing");
        return;
      }

      // Already in background mode
      if (backgroundModeRef.current) {
        return;
      }

      console.log(
        "[MobileBackgroundPlayback] Entering background mode for:",
        currentSong.title
      );
      backgroundModeRef.current = true;

      try {
        // Get audio URL if not already cached
        if (!audioUrlRef.current || audioUrlRef.current === "") {
          console.log("[MobileBackgroundPlayback] Extracting audio URL...");
          audioUrlRef.current = await getPlayableAudioUrl(currentSong.id);
          audioLoadAttemptRef.current = 0;
        }

        // Start playing in background audio manager
        await backgroundAudioRef.current.loadAndPlay(
          audioUrlRef.current,
          Math.max(0, currentYouTubeTime)
        );

        // Start time updates from background audio
        startBackgroundUpdates();

        // Request wake lock to prevent screen sleep
        await requestWakeLock();

        console.log("[MobileBackgroundPlayback] Background mode activated");
      } catch (error) {
        console.error("[MobileBackgroundPlayback] Failed to enter background mode:", error);

        // Retry logic for audio extraction
        audioLoadAttemptRef.current++;
        if (audioLoadAttemptRef.current < maxAudioLoadAttempts) {
          console.log(
            `[MobileBackgroundPlayback] Retrying audio extraction (${audioLoadAttemptRef.current}/${maxAudioLoadAttempts})...`
          );
          audioUrlRef.current = "";
          setTimeout(switchToBackgroundAudio, 2000);
        } else {
          console.error("[MobileBackgroundPlayback] Max retries reached");
          onError?.(error as Error);
        }
      }
    };

    const switchFromBackgroundAudio = async () => {
      if (!backgroundModeRef.current) return;

      console.log("[MobileBackgroundPlayback] Exiting background mode");
      backgroundModeRef.current = false;
      stopBackgroundUpdates();
      await releaseWakeLock();

      // Pause background audio
      backgroundAudioRef.current.pause();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        switchToBackgroundAudio();
      } else {
        switchFromBackgroundAudio();
      }
    };

    const handlePageHide = () => {
      console.log("[MobileBackgroundPlayback] Page hide event");
      switchToBackgroundAudio();
    };

    const handlePageShow = () => {
      console.log("[MobileBackgroundPlayback] Page show event");
      switchFromBackgroundAudio();
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [currentSong, isPlaying, currentYouTubeTime, onError]);

  // Sync playback time between YouTube player and background audio
  const syncPlaybackTime = useCallback(
    (youtubeCurrentTime: number) => {
      if (
        backgroundModeRef.current &&
        backgroundAudioRef.current.isPlaying()
      ) {
        const bgTime = backgroundAudioRef.current.getCurrentTime();
        // Allow small drift (1.5 seconds) before resyncing
        if (Math.abs(bgTime - youtubeCurrentTime) > 1.5) {
          console.debug(
            `[MobileBackgroundPlayback] Syncing time: ${bgTime.toFixed(2)}s -> ${youtubeCurrentTime.toFixed(2)}s`
          );
          backgroundAudioRef.current.seek(youtubeCurrentTime);
        }
      }
    },
    []
  );

  const startBackgroundUpdates = useCallback(() => {
    if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);

    updateIntervalRef.current = setInterval(() => {
      if (backgroundModeRef.current && backgroundAudioRef.current) {
        const currentTime = backgroundAudioRef.current.getCurrentTime();
        onTimeUpdate?.(currentTime);

        // Check if track ended
        const duration = backgroundAudioRef.current.getDuration();
        if (
          duration > 0 &&
          currentTime >= duration - 0.5 &&
          backgroundAudioRef.current.isPlaying()
        ) {
          console.log("[MobileBackgroundPlayback] Background audio ended");
          onEnded?.();
        }
      }
    }, 250);
  }, [onTimeUpdate, onEnded]);

  const stopBackgroundUpdates = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  const requestWakeLock = async () => {
    if (!("wakeLock" in navigator)) {
      console.debug("[MobileBackgroundPlayback] Wake Lock API not available");
      return;
    }

    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request(
        "screen"
      );
      console.log("[MobileBackgroundPlayback] Wake lock acquired");

      // Handle wake lock release
      wakeLockRef.current.addEventListener("release", () => {
        console.debug("[MobileBackgroundPlayback] Wake lock was released");
        wakeLockRef.current = null;
      });
    } catch (error) {
      console.debug("[MobileBackgroundPlayback] Wake lock request failed:", error);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log("[MobileBackgroundPlayback] Wake lock released");
      } catch (error) {
        console.debug("[MobileBackgroundPlayback] Failed to release wake lock:", error);
      }
    }
  };

  // Set volume on background audio when YouTube player volume changes
  useEffect(() => {
    // Volume is set via the player context, we'll sync it through the provider
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBackgroundUpdates();
      releaseWakeLock().catch(console.error);
      // Don't destroy - keep as singleton for better performance
    };
  }, [stopBackgroundUpdates]);

  return {
    syncPlaybackTime,
    isInBackgroundMode: () => backgroundModeRef.current,
    getBackgroundTime: () =>
      backgroundAudioRef.current.getCurrentTime(),
    setBackgroundVolume: (volume: number) =>
      backgroundAudioRef.current.setVolume(volume),
  };
}
