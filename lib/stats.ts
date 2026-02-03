"use client";

import type { YouTubeVideo } from "./youtube";

export interface TrackStats {
  trackId: string;
  title: string;
  artist: string;
  playCount: number;
  lastPlayed: number;
  totalListeningTime: number; // in seconds
  likedAt?: number;
  addedToPlaylistCount: number;
}

export interface ArtistStats {
  artist: string;
  playCount: number;
  totalListeningTime: number;
  topTracks: TrackStats[];
}

export interface ListeningStats {
  totalTracks: number;
  totalArtists: number;
  totalListeningTime: number; // in seconds
  averageTrackLength: number;
  topTracks: TrackStats[];
  topArtists: ArtistStats[];
  likedTracksCount: number;
  playlistsCount: number;
  lastListenedAt: number;
  thisWeekListeningTime: number;
  thisMonthListeningTime: number;
}

const STATS_DB_NAME = "pulse-music-stats";
const STATS_DB_VERSION = 1;

let statsDb: IDBDatabase | null = null;

async function getStatsDB(): Promise<IDBDatabase> {
  if (statsDb) return statsDb;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STATS_DB_NAME, STATS_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      statsDb = request.result;
      resolve(statsDb);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains("trackStats")) {
        const trackStatsStore = database.createObjectStore("trackStats", {
          keyPath: "trackId",
        });
        trackStatsStore.createIndex("playCount", "playCount", {
          unique: false,
        });
        trackStatsStore.createIndex("lastPlayed", "lastPlayed", {
          unique: false,
        });
      }

      if (!database.objectStoreNames.contains("listeningHistory")) {
        const historyStore = database.createObjectStore("listeningHistory", {
          keyPath: "id",
          autoIncrement: true,
        });
        historyStore.createIndex("timestamp", "timestamp", {
          unique: false,
        });
        historyStore.createIndex("date", "date", { unique: false });
      }
    };
  });
}

export async function recordTrackPlay(track: YouTubeVideo): Promise<void> {
  try {
    const db = await getStatsDB();
    const transaction = db.transaction(["trackStats", "listeningHistory"], "readwrite");

    // Update track stats
    const statsStore = transaction.objectStore("trackStats");
    const existing = await new Promise<TrackStats | undefined>((resolve) => {
      const req = statsStore.get(track.id);
      req.onsuccess = () => resolve(req.result);
    });

    const now = Date.now();
    const durationSeconds = typeof track.duration === 'string' 
      ? parseInt(track.duration, 10) || 0 
      : (track.duration || 0);
    
    const updatedStats: TrackStats = {
      trackId: track.id,
      title: track.title,
      artist: track.channelTitle,
      playCount: (existing?.playCount || 0) + 1,
      lastPlayed: now,
      totalListeningTime:
        (existing?.totalListeningTime || 0) + durationSeconds,
      likedAt: existing?.likedAt,
      addedToPlaylistCount: existing?.addedToPlaylistCount || 0,
    };

    await new Promise<void>((resolve, reject) => {
      const req = statsStore.put(updatedStats);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Record in listening history
    const historyStore = transaction.objectStore("listeningHistory");
    await new Promise<void>((resolve, reject) => {
      const req = historyStore.add({
        trackId: track.id,
        title: track.title,
        artist: track.channelTitle,
        duration: track.duration,
        timestamp: now,
        date: new Date(now).toISOString().split("T")[0],
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error("[Stats] Error recording play:", error);
  }
}

export async function getTopTracks(limit: number = 10): Promise<TrackStats[]> {
  try {
    const db = await getStatsDB();
    const store = db.transaction("trackStats", "readonly").objectStore("trackStats");
    const index = store.index("playCount");

    return new Promise((resolve, reject) => {
      const req = index.openCursor(null, "prev");
      const results: TrackStats[] = [];

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error("[Stats] Error getting top tracks:", error);
    return [];
  }
}

export async function getTopArtists(limit: number = 10): Promise<ArtistStats[]> {
  try {
    const topTracks = await getTopTracks(100);
    const artistMap = new Map<string, ArtistStats>();

    topTracks.forEach((track) => {
      const existing = artistMap.get(track.artist) || {
        artist: track.artist,
        playCount: 0,
        totalListeningTime: 0,
        topTracks: [],
      };

      existing.playCount += track.playCount;
      existing.totalListeningTime += track.totalListeningTime;
      existing.topTracks.push(track);

      artistMap.set(track.artist, existing);
    });

    const artists = Array.from(artistMap.values())
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, limit);

    return artists.map((artist) => ({
      ...artist,
      topTracks: artist.topTracks.slice(0, 3),
    }));
  } catch (error) {
    console.error("[Stats] Error getting top artists:", error);
    return [];
  }
}

export async function getListeningStats(): Promise<ListeningStats> {
  try {
    const db = await getStatsDB();
    const transaction = db.transaction(["trackStats", "listeningHistory"], "readonly");

    const allTracks = await new Promise<TrackStats[]>((resolve, reject) => {
      const store = transaction.objectStore("trackStats");
      const results: TrackStats[] = [];

      const req = store.openCursor();
      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const weekTracks = allTracks.filter((t) => t.lastPlayed >= weekAgo);
    const monthTracks = allTracks.filter((t) => t.lastPlayed >= monthAgo);

    const topTracks = allTracks
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 10);

    const topArtists = await getTopArtists(5);

    return {
      totalTracks: allTracks.length,
      totalArtists: new Set(allTracks.map((t) => t.artist)).size,
      totalListeningTime: allTracks.reduce((sum, t) => sum + t.totalListeningTime, 0),
      averageTrackLength:
        allTracks.length > 0
          ? allTracks.reduce((sum, t) => sum + t.totalListeningTime, 0) /
            allTracks.length
          : 0,
      topTracks,
      topArtists,
      likedTracksCount: allTracks.filter((t) => t.likedAt).length,
      playlistsCount: 0, // Will be fetched from supabase
      lastListenedAt: Math.max(...allTracks.map((t) => t.lastPlayed)),
      thisWeekListeningTime: weekTracks.reduce((sum, t) => sum + t.totalListeningTime, 0),
      thisMonthListeningTime: monthTracks.reduce(
        (sum, t) => sum + t.totalListeningTime,
        0
      ),
    };
  } catch (error) {
    console.error("[Stats] Error getting listening stats:", error);
    return {
      totalTracks: 0,
      totalArtists: 0,
      totalListeningTime: 0,
      averageTrackLength: 0,
      topTracks: [],
      topArtists: [],
      likedTracksCount: 0,
      playlistsCount: 0,
      lastListenedAt: 0,
      thisWeekListeningTime: 0,
      thisMonthListeningTime: 0,
    };
  }
}

export function formatListeningTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
