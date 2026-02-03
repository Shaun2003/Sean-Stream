"use client";

import { supabase } from "./supabase/client";

export interface TrackLyrics {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  lyrics: string;
  lyricsSource: string;
  syncedLyrics?: SyncedLyric[];
}

export interface SyncedLyric {
  timestamp: number; // in milliseconds
  line: string;
}

const LYRICS_CACHE_KEY = "pulse-lyrics-cache";
const LYRICS_API_TIMEOUT = 5000;

async function searchLyricsOnline(
  title: string,
  artist: string
): Promise<string | null> {
  try {
    // Using a free lyrics API (Genius alternative: musixmatch or letras API)
    const query = encodeURIComponent(`${title} ${artist}`);
    
    // Try with common lyrics API endpoints
    const response = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
      { signal: AbortSignal.timeout(LYRICS_API_TIMEOUT) }
    );

    if (response.ok) {
      const data = (await response.json()) as { lyrics?: string };
      return data.lyrics || null;
    }
    return null;
  } catch (error) {
    console.error("[Lyrics] Error fetching lyrics:", error);
    return null;
  }
}

export async function getTrackLyrics(
  trackId: string,
  title: string,
  artist: string
): Promise<TrackLyrics | null> {
  try {
    // Try cache first
    const cached = localStorage.getItem(LYRICS_CACHE_KEY);
    if (cached) {
      const cache = JSON.parse(cached) as Record<string, TrackLyrics>;
      if (cache[trackId]) {
        return cache[trackId];
      }
    }

    // Try database
    const { data, error } = await supabase
      .from("track_lyrics")
      .select("*")
      .eq("track_id", trackId)
      .single();

    if (data && !error) {
      const lyrics: TrackLyrics = {
        id: data.id,
        trackId: data.track_id,
        title: data.title,
        artist: data.artist,
        lyrics: data.lyrics,
        lyricsSource: data.lyrics_source,
      };
      cacheLyrics(trackId, lyrics);
      return lyrics;
    }

    // Fetch from online source
    const lyricsText = await searchLyricsOnline(title, artist);
    if (lyricsText) {
      const newLyrics: TrackLyrics = {
        id: Math.random().toString(36).substr(2, 9),
        trackId,
        title,
        artist,
        lyrics: lyricsText,
        lyricsSource: "lyrics.ovh",
      };

      // Save to database
      await supabase.from("track_lyrics").insert({
        track_id: trackId,
        title,
        artist,
        lyrics: lyricsText,
        lyrics_source: "lyrics.ovh",
      });

      cacheLyrics(trackId, newLyrics);
      return newLyrics;
    }

    return null;
  } catch (error) {
    console.error("[Lyrics] Error getting lyrics:", error);
    return null;
  }
}

function cacheLyrics(trackId: string, lyrics: TrackLyrics): void {
  try {
    const cached = localStorage.getItem(LYRICS_CACHE_KEY) || "{}";
    const cache = JSON.parse(cached) as Record<string, TrackLyrics>;
    cache[trackId] = lyrics;

    // Keep only last 50 cached lyrics
    const entries = Object.entries(cache);
    if (entries.length > 50) {
      const sortedEntries = entries.slice(entries.length - 50);
      localStorage.setItem(LYRICS_CACHE_KEY, JSON.stringify(Object.fromEntries(sortedEntries)));
    } else {
      localStorage.setItem(LYRICS_CACHE_KEY, JSON.stringify(cache));
    }
  } catch (error) {
    console.error("[Lyrics] Error caching lyrics:", error);
  }
}

export async function saveSyncedLyrics(
  trackId: string,
  syncedLyrics: SyncedLyric[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("track_lyrics")
      .update({ synced_lyrics: syncedLyrics })
      .eq("track_id", trackId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[Lyrics] Error saving synced lyrics:", error);
    return false;
  }
}
