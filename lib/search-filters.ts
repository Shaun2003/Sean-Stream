"use client";

import type { YouTubeVideo } from "./youtube";

export interface SearchFilters {
  query: string;
  genre?: string;
  artist?: string;
  duration?: {
    min?: number; // seconds
    max?: number; // seconds
  };
  year?: string;
  sortBy?: "relevance" | "date" | "duration" | "views";
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export const GENRES = [
  "Pop",
  "Hip-Hop",
  "Rock",
  "R&B",
  "Country",
  "Electronic",
  "Jazz",
  "Classical",
  "Indie",
  "Metal",
  "Reggae",
  "K-Pop",
  "Latin",
  "Soul",
];

export const DURATION_FILTERS = [
  { value: "0-180", label: "Under 3 minutes", min: 0, max: 180 },
  { value: "180-300", label: "3-5 minutes", min: 180, max: 300 },
  { value: "300-600", label: "5-10 minutes", min: 300, max: 600 },
  { value: "600-9999", label: "Over 10 minutes", min: 600, max: 9999 },
];

export const SORT_OPTIONS: Array<{
  value: SearchFilters["sortBy"];
  label: string;
}> = [
  { value: "relevance", label: "Most Relevant" },
  { value: "date", label: "Newest First" },
  { value: "duration", label: "Duration" },
  { value: "views", label: "Most Popular" },
];

export function filterTracks(
  tracks: YouTubeVideo[],
  filters: Partial<SearchFilters>
): YouTubeVideo[] {
  let filtered = [...tracks];

  // Genre filter
  if (filters.genre) {
    filtered = filtered.filter(
      (track) =>
        track.title.toLowerCase().includes(filters.genre!.toLowerCase()) ||
        track.channelTitle.toLowerCase().includes(filters.genre!.toLowerCase())
    );
  }

  // Artist filter
  if (filters.artist) {
    filtered = filtered.filter((track) =>
      track.channelTitle.toLowerCase().includes(filters.artist!.toLowerCase())
    );
  }

  // Duration filter
  if (filters.duration?.min !== undefined || filters.duration?.max !== undefined) {
    filtered = filtered.filter((track) => {
      const durationSeconds = typeof track.duration === 'string'
        ? parseInt(track.duration, 10) || 0
        : (track.duration || 0);
      const min = filters.duration?.min ?? 0;
      const max = filters.duration?.max ?? 9999;
      return durationSeconds >= min && durationSeconds <= max;
    });
  }

  // Year filter (search in title)
  if (filters.year) {
    filtered = filtered.filter((track) =>
      track.title.includes(filters.year!)
    );
  }

  // Sorting
  if (filters.sortBy === "duration") {
    filtered.sort((a, b) => {
      const aDuration = typeof a.duration === 'string' ? parseInt(a.duration, 10) || 0 : (a.duration || 0);
      const bDuration = typeof b.duration === 'string' ? parseInt(b.duration, 10) || 0 : (b.duration || 0);
      return aDuration - bDuration;
    });
  }

  return filtered;
}

export function extractGenreFromTitle(title: string): string | null {
  const titleLower = title.toLowerCase();
  for (const genre of GENRES) {
    if (titleLower.includes(genre.toLowerCase())) {
      return genre;
    }
  }
  return null;
}

export function saveSearchFilter(
  filterId: string,
  filters: SearchFilters
): void {
  try {
    const saved = localStorage.getItem("pulse-saved-filters") || "{}";
    const allFilters = JSON.parse(saved);
    allFilters[filterId] = {
      ...filters,
      savedAt: Date.now(),
    };
    localStorage.setItem("pulse-saved-filters", JSON.stringify(allFilters));
  } catch (error) {
    console.error("[Filters] Error saving filter:", error);
  }
}

export function getSavedFilters(): Record<string, SearchFilters & { savedAt: number }> {
  try {
    const saved = localStorage.getItem("pulse-saved-filters") || "{}";
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

export function deleteSavedFilter(filterId: string): void {
  try {
    const saved = localStorage.getItem("pulse-saved-filters") || "{}";
    const allFilters = JSON.parse(saved);
    delete allFilters[filterId];
    localStorage.setItem("pulse-saved-filters", JSON.stringify(allFilters));
  } catch (error) {
    console.error("[Filters] Error deleting filter:", error);
  }
}
