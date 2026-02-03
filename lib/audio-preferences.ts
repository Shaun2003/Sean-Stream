"use client";

import { supabase } from "./supabase/client";

export type AudioQuality = "low" | "normal" | "high" | "very-high";
export type EqualizerPreset = "normal" | "bass-boost" | "treble-boost" | "vocal" | "flat" | "custom";

export interface EqualizerSettings {
  preset: EqualizerPreset;
  bands: {
    "60Hz": number;
    "250Hz": number;
    "1kHz": number;
    "4kHz": number;
    "16kHz": number;
  };
  gain: number;
}

export interface UserAudioPreferences {
  equalizerPreset: EqualizerPreset;
  equalizerSettings: EqualizerSettings;
  playbackSpeed: number; // 0.5 - 2.0
  crossfadeDuration: number; // 0 - 10 seconds
  gaplessPlayback: boolean;
  audioQuality: AudioQuality;
  theme: "dark" | "light" | "auto";
  volumeNormalization: boolean;
}

const EQUALIZER_PRESETS: Record<EqualizerPreset, EqualizerSettings> = {
  normal: {
    preset: "normal",
    bands: {
      "60Hz": 0,
      "250Hz": 0,
      "1kHz": 0,
      "4kHz": 0,
      "16kHz": 0,
    },
    gain: 0,
  },
  "bass-boost": {
    preset: "bass-boost",
    bands: {
      "60Hz": 8,
      "250Hz": 4,
      "1kHz": 0,
      "4kHz": 0,
      "16kHz": 0,
    },
    gain: 2,
  },
  "treble-boost": {
    preset: "treble-boost",
    bands: {
      "60Hz": 0,
      "250Hz": 0,
      "1kHz": 0,
      "4kHz": 4,
      "16kHz": 8,
    },
    gain: 2,
  },
  vocal: {
    preset: "vocal",
    bands: {
      "60Hz": -2,
      "250Hz": 1,
      "1kHz": 4,
      "4kHz": 3,
      "16kHz": 0,
    },
    gain: 1,
  },
  flat: {
    preset: "flat",
    bands: {
      "60Hz": 0,
      "250Hz": 0,
      "1kHz": 0,
      "4kHz": 0,
      "16kHz": 0,
    },
    gain: 0,
  },
  custom: {
    preset: "custom",
    bands: {
      "60Hz": 0,
      "250Hz": 0,
      "1kHz": 0,
      "4kHz": 0,
      "16kHz": 0,
    },
    gain: 0,
  },
};

const PREFS_CACHE_KEY = "pulse-audio-preferences";

export async function getUserAudioPreferences(): Promise<UserAudioPreferences> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return getDefaultPreferences();
    }

    // Check cache first
    const cached = localStorage.getItem(`${PREFS_CACHE_KEY}-${user.id}`);
    if (cached) {
      return JSON.parse(cached) as UserAudioPreferences;
    }

    // Fetch from database
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      // Create default preferences
      const defaults = getDefaultPreferences();
      await supabase.from("user_preferences").insert({
        id: user.id,
        equalizer_preset: defaults.equalizerPreset,
        playback_speed: defaults.playbackSpeed,
        crossfade_duration: defaults.crossfadeDuration,
        gapless_playback: defaults.gaplessPlayback,
        audio_quality: defaults.audioQuality,
        theme: defaults.theme,
      });
      return defaults;
    }

    const prefs: UserAudioPreferences = {
      equalizerPreset: (data.equalizer_preset || "normal") as EqualizerPreset,
      equalizerSettings: EQUALIZER_PRESETS[
        (data.equalizer_preset || "normal") as EqualizerPreset
      ],
      playbackSpeed: data.playback_speed || 1.0,
      crossfadeDuration: data.crossfade_duration || 0,
      gaplessPlayback: data.gapless_playback !== false,
      audioQuality: (data.audio_quality || "high") as AudioQuality,
      theme: (data.theme || "dark") as "dark" | "light" | "auto",
      volumeNormalization: true,
    };

    localStorage.setItem(`${PREFS_CACHE_KEY}-${user.id}`, JSON.stringify(prefs));
    return prefs;
  } catch (error) {
    console.error("[Audio Prefs] Error getting preferences:", error);
    return getDefaultPreferences();
  }
}

export function getDefaultPreferences(): UserAudioPreferences {
  return {
    equalizerPreset: "normal",
    equalizerSettings: EQUALIZER_PRESETS.normal,
    playbackSpeed: 1.0,
    crossfadeDuration: 0,
    gaplessPlayback: true,
    audioQuality: "high",
    theme: "dark",
    volumeNormalization: false,
  };
}

export async function updateAudioPreferences(
  updates: Partial<UserAudioPreferences>
): Promise<UserAudioPreferences> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const current = await getUserAudioPreferences();
    const updated = { ...current, ...updates };

    await supabase
      .from("user_preferences")
      .update({
        equalizer_preset: updated.equalizerPreset,
        playback_speed: updated.playbackSpeed,
        crossfade_duration: updated.crossfadeDuration,
        gapless_playback: updated.gaplessPlayback,
        audio_quality: updated.audioQuality,
        theme: updated.theme,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    localStorage.setItem(`${PREFS_CACHE_KEY}-${user.id}`, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("[Audio Prefs] Error updating preferences:", error);
    const current = await getUserAudioPreferences();
    return current;
  }
}

export async function setEqualizerPreset(
  preset: EqualizerPreset
): Promise<EqualizerSettings> {
  try {
    const settings = EQUALIZER_PRESETS[preset];
    await updateAudioPreferences({
      equalizerPreset: preset,
      equalizerSettings: settings,
    });
    return settings;
  } catch (error) {
    console.error("[Audio Prefs] Error setting preset:", error);
    return EQUALIZER_PRESETS.normal;
  }
}

export async function setPlaybackSpeed(speed: number): Promise<boolean> {
  try {
    const clampedSpeed = Math.max(0.5, Math.min(2.0, speed));
    await updateAudioPreferences({ playbackSpeed: clampedSpeed });
    return true;
  } catch (error) {
    console.error("[Audio Prefs] Error setting speed:", error);
    return false;
  }
}

export async function setCrossfade(duration: number): Promise<boolean> {
  try {
    const clampedDuration = Math.max(0, Math.min(10, duration));
    await updateAudioPreferences({ crossfadeDuration: clampedDuration });
    return true;
  } catch (error) {
    console.error("[Audio Prefs] Error setting crossfade:", error);
    return false;
  }
}

export async function setAudioQuality(quality: AudioQuality): Promise<boolean> {
  try {
    await updateAudioPreferences({ audioQuality: quality });
    return true;
  } catch (error) {
    console.error("[Audio Prefs] Error setting quality:", error);
    return false;
  }
}

export function getEqualizerPreset(preset: EqualizerPreset): EqualizerSettings {
  return EQUALIZER_PRESETS[preset];
}

export function getAllEqualizerPresets(): Array<{
  id: EqualizerPreset;
  name: string;
  description: string;
}> {
  return [
    { id: "normal", name: "Normal", description: "Balanced audio" },
    { id: "bass-boost", name: "Bass Boost", description: "Enhanced bass" },
    { id: "treble-boost", name: "Treble Boost", description: "Enhanced treble" },
    { id: "vocal", name: "Vocal", description: "Optimized for vocals" },
    { id: "flat", name: "Flat", description: "No EQ applied" },
    { id: "custom", name: "Custom", description: "Custom settings" },
  ];
}
