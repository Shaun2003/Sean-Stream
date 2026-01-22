"use client";

import type { YouTubeVideo } from "./youtube";

const DB_NAME = "pulse-music-db";
const DB_VERSION = 1;

interface StoredTrack extends YouTubeVideo {
  savedAt: number;
  playCount: number;
}

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

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Store for saved/offline tracks
      if (!database.objectStoreNames.contains("tracks")) {
        const tracksStore = database.createObjectStore("tracks", { keyPath: "id" });
        tracksStore.createIndex("savedAt", "savedAt", { unique: false });
        tracksStore.createIndex("playCount", "playCount", { unique: false });
      }

      // Store for playlists
      if (!database.objectStoreNames.contains("playlists")) {
        const playlistsStore = database.createObjectStore("playlists", { keyPath: "id" });
        playlistsStore.createIndex("name", "name", { unique: false });
      }

      // Store for recently played
      if (!database.objectStoreNames.contains("recentlyPlayed")) {
        const recentStore = database.createObjectStore("recentlyPlayed", { keyPath: "id" });
        recentStore.createIndex("playedAt", "playedAt", { unique: false });
      }

      // Store for liked tracks
      if (!database.objectStoreNames.contains("likedTracks")) {
        database.createObjectStore("likedTracks", { keyPath: "id" });
      }
    };
  });
}

// Track operations
export async function saveTrack(track: YouTubeVideo): Promise<void> {
  const database = await getDB();
  const transaction = database.transaction("tracks", "readwrite");
  const store = transaction.objectStore("tracks");

  const storedTrack: StoredTrack = {
    ...track,
    savedAt: Date.now(),
    playCount: 0,
  };

  store.put(storedTrack);
}

export async function getSavedTracks(): Promise<StoredTrack[]> {
  const database = await getDB();
  const transaction = database.transaction("tracks", "readonly");
  const store = transaction.objectStore("tracks");
  const index = store.index("savedAt");

  return new Promise((resolve, reject) => {
    const request = index.openCursor(null, "prev");
    const tracks: StoredTrack[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        tracks.push(cursor.value);
        cursor.continue();
      } else {
        resolve(tracks);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function removeTrack(id: string): Promise<void> {
  const database = await getDB();
  const transaction = database.transaction("tracks", "readwrite");
  const store = transaction.objectStore("tracks");
  store.delete(id);
}

export async function isTrackSaved(id: string): Promise<boolean> {
  const database = await getDB();
  const transaction = database.transaction("tracks", "readonly");
  const store = transaction.objectStore("tracks");

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(!!request.result);
    request.onerror = () => reject(request.error);
  });
}

// Recently played operations
export async function addToRecentlyPlayed(track: YouTubeVideo): Promise<void> {
  const database = await getDB();
  const transaction = database.transaction("recentlyPlayed", "readwrite");
  const store = transaction.objectStore("recentlyPlayed");

  store.put({ ...track, playedAt: Date.now() });

  // Keep only last 50 items
  const countRequest = store.count();
  countRequest.onsuccess = () => {
    if (countRequest.result > 50) {
      const index = store.index("playedAt");
      const cursorRequest = index.openCursor();
      let deleteCount = countRequest.result - 50;

      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && deleteCount > 0) {
          cursor.delete();
          deleteCount--;
          cursor.continue();
        }
      };
    }
  };
}

export async function getRecentlyPlayed(): Promise<YouTubeVideo[]> {
  const database = await getDB();
  const transaction = database.transaction("recentlyPlayed", "readonly");
  const store = transaction.objectStore("recentlyPlayed");
  const index = store.index("playedAt");

  return new Promise((resolve, reject) => {
    const request = index.openCursor(null, "prev");
    const tracks: YouTubeVideo[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor && tracks.length < 20) {
        tracks.push(cursor.value);
        cursor.continue();
      } else {
        resolve(tracks);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// Liked tracks operations
export async function likeTrack(track: YouTubeVideo): Promise<void> {
  const database = await getDB();
  const transaction = database.transaction("likedTracks", "readwrite");
  const store = transaction.objectStore("likedTracks");
  store.put({ ...track, likedAt: Date.now() });
}

export async function unlikeTrack(id: string): Promise<void> {
  const database = await getDB();
  const transaction = database.transaction("likedTracks", "readwrite");
  const store = transaction.objectStore("likedTracks");
  store.delete(id);
}

export async function getLikedTracks(): Promise<YouTubeVideo[]> {
  const database = await getDB();
  const transaction = database.transaction("likedTracks", "readonly");
  const store = transaction.objectStore("likedTracks");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function isTrackLiked(id: string): Promise<boolean> {
  const database = await getDB();
  const transaction = database.transaction("likedTracks", "readonly");
  const store = transaction.objectStore("likedTracks");

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(!!request.result);
    request.onerror = () => reject(request.error);
  });
}
