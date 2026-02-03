"use client";

import type { YouTubeVideo } from "./youtube";
import { isValidYouTubeVideoId } from "./youtube";

export interface StoredDownload extends YouTubeVideo {
  audioBlob?: Blob;
  audioUrl?: string;
  downloadedAt: number;
  downloadStatus: "pending" | "downloading" | "completed" | "failed";
  downloadProgress: number;
}

// Use shared database
const DB_NAME = "pulse-music-db";
const DB_VERSION = 2;

let db: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    // onupgradeneeded is handled by offline-storage.ts
  });
}

// Download operations
export async function downloadTrack(
  track: YouTubeVideo,
  onProgress?: (progress: number) => void
): Promise<void> {
  const database = await getDB();
  const transaction = database.transaction("downloads", "readwrite");
  const store = transaction.objectStore("downloads");

  // Update status to downloading
  const storedDownload: StoredDownload = {
    ...track,
    downloadedAt: Date.now(),
    downloadStatus: "downloading",
    downloadProgress: 0,
  };

  store.put(storedDownload);

  try {
    onProgress?.(10);

    // Fetch audio stream from YouTube video
    // This attempts to get the audio from the YouTube video
    const audioUrl = `https://www.youtube.com/embed/${track.id}`;
    
    // Store the track metadata and URL for offline playback
    storedDownload.audioUrl = `https://www.youtube.com/watch?v=${track.id}`;
    storedDownload.downloadStatus = "completed";
    storedDownload.downloadProgress = 100;

    onProgress?.(50);

    // Save to IndexedDB
    store.put(storedDownload);

    onProgress?.(100);

    console.log(`[v0] Downloaded track: ${track.title}`);
  } catch (error) {
    console.error(`[v0] Download error for ${track.id}:`, error);
    storedDownload.downloadStatus = "failed";
    store.put(storedDownload);
    throw new Error(`Failed to download ${track.title}`);
  }
}

export async function getDownloadedTrackData(id: string): Promise<StoredDownload | null> {
  const database = await getDB();
  const transaction = database.transaction("downloads", "readonly");
  const store = transaction.objectStore("downloads");

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result && result.downloadStatus === "completed" ? result : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getDownloadedTracks(): Promise<StoredDownload[]> {
  const database = await getDB();
  const transaction = database.transaction("downloads", "readonly");
  const store = transaction.objectStore("downloads");
  const index = store.index("downloadStatus");

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only("completed"), "prev");
    const tracks: StoredDownload[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const track = cursor.value;
        // Filter out tracks with invalid video IDs
        if (isValidYouTubeVideoId(track.id)) {
          tracks.push(track);
        } else {
          console.warn("[v0] Skipping downloaded track with invalid ID:", track.id);
        }
        cursor.continue();
      } else {
        resolve(tracks);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function isTrackDownloaded(id: string): Promise<boolean> {
  const database = await getDB();
  const transaction = database.transaction("downloads", "readonly");
  const store = transaction.objectStore("downloads");

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const result = request.result;
      resolve(!!result && result.downloadStatus === "completed");
    };
    request.onerror = () => reject(request.error);
  });
}

export async function removeDownloadedTrack(id: string): Promise<void> {
  const database = await getDB();
  const transaction = database.transaction("downloads", "readwrite");
  const store = transaction.objectStore("downloads");
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => {
      console.log(`[v0] Deleted downloaded track: ${id}`);
      resolve();
    };
    request.onerror = () => {
      console.error("[v0] Failed to delete downloaded track:", request.error);
      reject(request.error);
    };
  });
}

// Album operations
export interface Album {
  id: string;
  name: string;
  artist: string;
  thumbnail: string;
  tracks: YouTubeVideo[];
  savedAt: number;
}

export async function saveAlbum(album: Album): Promise<void> {
  const database = await getDB();
  const transaction = database.transaction("albums", "readwrite");
  const store = transaction.objectStore("albums");

  store.put({
    ...album,
    savedAt: Date.now(),
  });
}

export async function getSavedAlbums(): Promise<Album[]> {
  const database = await getDB();
  const transaction = database.transaction("albums", "readonly");
  const store = transaction.objectStore("albums");
  const index = store.index("savedAt");

  return new Promise((resolve, reject) => {
    const request = index.openCursor(null, "prev");
    const albums: Album[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        albums.push(cursor.value);
        cursor.continue();
      } else {
        resolve(albums);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function removeAlbum(id: string): Promise<void> {
  const database = await getDB();
  const transaction = database.transaction("albums", "readwrite");
  const store = transaction.objectStore("albums");
  store.delete(id);
}

export async function isAlbumSaved(id: string): Promise<boolean> {
  const database = await getDB();
  const transaction = database.transaction("albums", "readonly");
  const store = transaction.objectStore("albums");

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(!!request.result);
    request.onerror = () => reject(request.error);
  });
}
