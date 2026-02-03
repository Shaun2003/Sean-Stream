"use client";

import { useEffect } from "react";

export interface KeyboardShortcutsConfig {
  onPlayPause?: () => void;
  onNextTrack?: () => void;
  onPreviousTrack?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onMute?: () => void;
  onSearch?: () => void;
  onLike?: () => void;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const activeElement = document.activeElement as HTMLElement;
      const isInputFocused =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.contentEditable === "true";

      if (isInputFocused) return;

      switch (event.code) {
        // Space: Play/Pause
        case "Space":
          event.preventDefault();
          config.onPlayPause?.();
          break;

        // ArrowRight: Next track
        case "ArrowRight":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            config.onNextTrack?.();
          }
          break;

        // ArrowLeft: Previous track
        case "ArrowLeft":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            config.onPreviousTrack?.();
          }
          break;

        // ArrowUp: Volume up
        case "ArrowUp":
          if (event.altKey) {
            event.preventDefault();
            config.onVolumeUp?.();
          }
          break;

        // ArrowDown: Volume down
        case "ArrowDown":
          if (event.altKey) {
            event.preventDefault();
            config.onVolumeDown?.();
          }
          break;

        // M: Mute/Unmute
        case "KeyM":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            config.onMute?.();
          }
          break;

        // K or /: Open search
        case "KeyK":
        case "Slash":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            config.onSearch?.();
          }
          break;

        // L: Like track
        case "KeyL":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            config.onLike?.();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config]);
}
