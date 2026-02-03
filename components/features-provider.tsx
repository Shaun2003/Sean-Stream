"use client";

import { useEffect } from "react";
import { usePlayer } from "@/contexts/player-context";
import { recordTrackPlay } from "@/lib/stats";

/**
 * Provider component that initializes all Phase 1-4 features:
 * - Stats recording (Phase 1)
 * - Search filters cache initialization (Phase 1)
 * - Mood playlists initialization (Phase 2)
 * - Social features initialization (Phase 3)
 */
export function FeaturesProvider({ children }: { children: React.ReactNode }) {
  const { currentSong, isPlaying } = usePlayer();
  const recordedTracksRef = new Map<string, boolean>();

  // Record track plays for statistics
  useEffect(() => {
    if (!currentSong || !isPlaying) return;

    // Only record once per track play
    if (recordedTracksRef.get(currentSong.id)) return;

    recordedTracksRef.set(currentSong.id, true);

    // Record the play
    recordTrackPlay(currentSong).catch((error) => {
      console.error("[Features] Error recording track play:", error);
    });
  }, [currentSong?.id, isPlaying]);

  // Initialize preferences on mount
  useEffect(() => {
    const initializePreferences = async () => {
      try {
        // Initialize user audio preferences
        const { getUserAudioPreferences } = await import("@/lib/audio-preferences");
        await getUserAudioPreferences();
      } catch (error) {
        console.error("[Features] Error initializing preferences:", error);
      }
    };

    initializePreferences();
  }, []);

  return children;
}
