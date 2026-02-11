"use client";

import type { YouTubeVideo } from "./youtube";
import { searchYouTube } from "./youtube";

export type MoodType = "chill" | "workout" | "focus" | "party" | "romantic" | "sad" | "happy";

export interface MoodPlaylist {
  id: string;
  mood: MoodType;
  name: string;
  description: string;
  emoji: string;
  tracks: YouTubeVideo[];
  createdAt: number;
  color: string;
  image?: string;
  tagline?: string;
}

const MOOD_CONFIGS: Record<MoodType, { name: string; description: string; emoji: string; queries: string[]; color: string; image: string; tagline: string }> = {
  chill: {
    name: "Chill",
    description: "Relaxing vibes for unwinding",
    emoji: "😎",
    queries: [
      "chill lofi beats",
      "relaxing lo-fi hip hop",
      "ambient chill music",
      "peaceful instrumental",
      "laid back vibes",
    ],
    color: "#4D96FF",
    image: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    tagline: "Unwind with smooth, relaxing beats"
  },
  workout: {
    name: "Workout",
    description: "High energy for exercise",
    emoji: "💪",
    queries: [
      "workout music high energy",
      "gym motivation beats",
      "running music fast",
      "intense workout songs",
      "cardio pump music",
    ],
    color: "#FF6B6B",
    image: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    tagline: "Push your limits with high-energy tracks"
  },
  focus: {
    name: "Focus",
    description: "Concentration and productivity",
    emoji: "🧠",
    queries: [
      "focus music productive",
      "study beats concentration",
      "deep focus instrumental",
      "work music ambient",
      "focus flow music",
    ],
    color: "#6BCB77",
    image: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
    tagline: "Deep concentration for maximum productivity"
  },
  party: {
    name: "Party",
    description: "Dance and celebration",
    emoji: "🎉",
    queries: [
      "party music dance hits",
      "club banger tracks",
      "dance party music",
      "electronic dance music",
      "festival bangers",
    ],
    color: "#FFD93D",
    image: "linear-gradient(135deg, #ff9b56 0%, #ff6a88 100%)",
    tagline: "Get the party started with dance hits"
  },
  romantic: {
    name: "Romantic",
    description: "Love and connection",
    emoji: "💕",
    queries: [
      "romantic love songs",
      "slow love ballads",
      "romantic dinner music",
      "soulful love songs",
      "love duets",
    ],
    color: "#FF1493",
    image: "linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)",
    tagline: "Feel the love with romantic melodies"
  },
  sad: {
    name: "Sad",
    description: "Emotional and introspective",
    emoji: "😢",
    queries: [
      "sad emotional songs",
      "breakup music",
      "melancholic ballads",
      "introspective lyrics",
      "heartbreak songs",
    ],
    color: "#4B5582",
    image: "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)",
    tagline: "Express your emotions with soulful songs"
  },
  happy: {
    name: "Happy",
    description: "Feel-good and uplifting",
    emoji: "😊",
    queries: [
      "happy feel good songs",
      "uplifting positive music",
      "feel good hits",
      "infectious happiness vibes",
      "celebration songs",
    ],
    color: "#FFD700",
    image: "linear-gradient(135deg, #ffd89b 0%, #19547b 100%)",
    tagline: "Boost your mood with feel-good vibes"
  },
};

const MOOD_PLAYLISTS_KEY = "pulse-mood-playlists";

export async function generateMoodPlaylist(mood: MoodType): Promise<MoodPlaylist> {
  try {
    const config = MOOD_CONFIGS[mood];
    const allTracks: YouTubeVideo[] = [];
    const seenIds = new Set<string>();

    // Search for tracks using multiple queries
    for (const query of config.queries) {
      try {
        const results = await searchYouTube(query);
        for (const track of results.videos) {
          if (!seenIds.has(track.id)) {
            allTracks.push(track);
            seenIds.add(track.id);
            if (allTracks.length >= 30) break;
          }
        }
      } catch (error) {
        console.error(`[Mood] Error searching for "${query}":`, error);
      }

      if (allTracks.length >= 30) break;
    }

    const playlist: MoodPlaylist = {
      id: `mood-${mood}-${Date.now()}`,
      mood,
      name: config.name,
      description: config.description,
      emoji: config.emoji,
      tracks: allTracks.slice(0, 30),
      createdAt: Date.now(),
      color: config.color,
    };

    saveMoodPlaylist(playlist);
    return playlist;
  } catch (error) {
    console.error(`[Mood] Error generating ${mood} playlist:`, error);
    throw error;
  }
}

export function getMoodConfig(mood: MoodType) {
  return MOOD_CONFIGS[mood];
}

export function saveMoodPlaylist(playlist: MoodPlaylist): void {
  try {
    const cached = localStorage.getItem(MOOD_PLAYLISTS_KEY) || "[]";
    const playlists = JSON.parse(cached) as MoodPlaylist[];

    // Replace if exists, otherwise add
    const index = playlists.findIndex((p) => p.mood === playlist.mood);
    if (index >= 0) {
      playlists[index] = playlist;
    } else {
      playlists.push(playlist);
    }

    localStorage.setItem(MOOD_PLAYLISTS_KEY, JSON.stringify(playlists));
  } catch (error) {
    console.error("[Mood] Error saving playlist:", error);
  }
}

export function getMoodPlaylists(): MoodPlaylist[] {
  try {
    const cached = localStorage.getItem(MOOD_PLAYLISTS_KEY) || "[]";
    return JSON.parse(cached);
  } catch {
    return [];
  }
}

export function getMoodPlaylist(mood: MoodType): MoodPlaylist | null {
  const playlists = getMoodPlaylists();
  return playlists.find((p) => p.mood === mood) || null;
}

export function deleteMoodPlaylist(mood: MoodType): void {
  try {
    const cached = localStorage.getItem(MOOD_PLAYLISTS_KEY) || "[]";
    const playlists = JSON.parse(cached) as MoodPlaylist[];
    const updated = playlists.filter((p) => p.mood !== mood);
    localStorage.setItem(MOOD_PLAYLISTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("[Mood] Error deleting playlist:", error);
  }
}
