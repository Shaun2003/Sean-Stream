"use client";

import { usePlayer } from "@/contexts/player-context";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useCallback } from "react";

/**
 * Component that enables global keyboard shortcuts for the music player
 * Shortcuts:
 * - Space: Play/Pause
 * - Ctrl+Right Arrow: Next track
 * - Ctrl+Left Arrow: Previous track
 * - Alt+Up Arrow: Volume up
 * - Alt+Down Arrow: Volume down
 * - Ctrl+M: Mute/Unmute
 * - Ctrl+K: Open search
 * - Ctrl+L: Like current track
 */
export function KeyboardShortcutsManager() {
  const { togglePlayPause, nextTrack, previousTrack, volume, setVolume } = usePlayer();

  const handleVolumeUp = useCallback(() => {
    const newVolume = Math.min(100, volume + 5);
    setVolume(newVolume);
  }, [volume, setVolume]);

  const handleVolumeDown = useCallback(() => {
    const newVolume = Math.max(0, volume - 5);
    setVolume(newVolume);
  }, [volume, setVolume]);

  const handleSearch = useCallback(() => {
    // Find the search input and focus it
    const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }, []);

  const handleLike = useCallback(() => {
    // Trigger like button click
    const likeButton = document.querySelector('[data-like-button="true"]') as HTMLButtonElement;
    if (likeButton) {
      likeButton.click();
    }
  }, []);

  useKeyboardShortcuts({
    onPlayPause: togglePlayPause,
    onNextTrack: nextTrack,
    onPreviousTrack: previousTrack,
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown,
    onSearch: handleSearch,
    onLike: handleLike,
  });

  return null; // This component doesn't render anything
}
