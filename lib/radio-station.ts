"use client";

import type { YouTubeVideo } from "./youtube";
import { searchYouTube } from "./youtube";

export interface RadioStation {
  id: string;
  baseSongId: string;
  baseSongTitle: string;
  baseSongArtist: string;
  generatedQueue: YouTubeVideo[];
  createdAt: number;
}

const RADIO_CACHE_KEY = "pulse-radio-stations";

export async function generateRadioStation(
  baseSong: YouTubeVideo
): Promise<RadioStation> {
  try {
    // Generate search queries based on the song
    const queries = [
      `${baseSong.channelTitle} similar songs`,
      `songs like ${baseSong.title}`,
      `${baseSong.channelTitle} best songs`,
      `${baseSong.channelTitle} playlist`,
      `artists similar to ${baseSong.channelTitle}`,
    ];

    const allResults: YouTubeVideo[] = [];
    const seenIds = new Set<string>();

    // Add the base song
    seenIds.add(baseSong.id);

    for (const query of queries) {
      try {
        const results = await searchYouTube(query);
        for (const track of results.videos) {
          if (!seenIds.has(track.id)) {
            allResults.push(track);
            seenIds.add(track.id);
            if (allResults.length >= 50) break; // Limit queue size
          }
        }
      } catch (error) {
        console.error(`[Radio] Error searching for "${query}":`, error);
      }

      if (allResults.length >= 50) break;
    }

    const station: RadioStation = {
      id: `radio-${Date.now()}`,
      baseSongId: baseSong.id,
      baseSongTitle: baseSong.title,
      baseSongArtist: baseSong.channelTitle,
      generatedQueue: allResults.slice(0, 50),
      createdAt: Date.now(),
    };

    saveRadioStation(station);
    return station;
  } catch (error) {
    console.error("[Radio] Error generating radio station:", error);
    throw error;
  }
}

export function saveRadioStation(station: RadioStation): void {
  try {
    const cached = localStorage.getItem(RADIO_CACHE_KEY) || "[]";
    const stations = JSON.parse(cached) as RadioStation[];

    // Keep only last 10 stations
    const updated = [station, ...stations].slice(0, 10);
    localStorage.setItem(RADIO_CACHE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("[Radio] Error saving station:", error);
  }
}

export function getSavedRadioStations(): RadioStation[] {
  try {
    const cached = localStorage.getItem(RADIO_CACHE_KEY) || "[]";
    return JSON.parse(cached);
  } catch {
    return [];
  }
}

export function deleteRadioStation(stationId: string): void {
  try {
    const cached = localStorage.getItem(RADIO_CACHE_KEY) || "[]";
    const stations = JSON.parse(cached) as RadioStation[];
    const updated = stations.filter((s) => s.id !== stationId);
    localStorage.setItem(RADIO_CACHE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("[Radio] Error deleting station:", error);
  }
}
