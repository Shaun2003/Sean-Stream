"use client";

interface SearchHistory {
  query: string;
  timestamp: number;
}

const STORAGE_KEY = "pulse-search-history";

export function getSearchHistory(): SearchHistory[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addSearchToHistory(query: string): void {
  try {
    const history = getSearchHistory();
    const filtered = history.filter((item) => item.query !== query);
    const updated = [{ query, timestamp: Date.now() }, ...filtered].slice(0, 50); // Keep last 50
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save search history:", error);
  }
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear search history:", error);
  }
}

export function removeSearchHistoryItem(query: string): void {
  try {
    const history = getSearchHistory();
    const filtered = history.filter((item) => item.query !== query);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove search history item:", error);
  }
}
