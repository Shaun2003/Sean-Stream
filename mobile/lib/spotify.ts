import { encode as base64Encode } from 'base-64';

const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
const SPOTIFY_CLIENT_SECRET = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET ?? '';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// --- Types ---

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
    release_date: string;
  };
  duration_ms: number;
  preview_url: string | null;
  explicit: boolean;
  popularity: number;
  external_urls: { spotify: string };
  uri: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  images: { url: string; width: number; height: number }[];
  release_date: string;
  total_tracks: number;
  tracks: { items: SpotifyTrack[] };
  external_urls: { spotify: string };
  genres: string[];
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  genres: string[];
  popularity: number;
  followers: { total: number };
  external_urls: { spotify: string };
}

export interface SpotifySearchResult {
  tracks?: { items: SpotifyTrack[]; total: number };
  albums?: { items: SpotifyAlbum[]; total: number };
  artists?: { items: SpotifyArtist[]; total: number };
}

export interface SpotifyCategory {
  id: string;
  name: string;
  icons: { url: string }[];
}

// --- Normalized track type used across the app ---

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId?: string;
  coverUrl: string;
  duration: number; // seconds
  spotifyId: string;
  youtubeId?: string;
  previewUrl?: string;
}

// --- Token Management ---

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const credentials = base64Encode(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify token error: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

async function spotifyFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`${SPOTIFY_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

// --- Helpers ---

export function normalizeTrack(t: SpotifyTrack): Track {
  return {
    id: `spotify-${t.id}`,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    artistId: t.artists[0]?.id,
    album: t.album.name,
    albumId: t.album.id,
    coverUrl: t.album.images[0]?.url ?? '',
    duration: Math.floor(t.duration_ms / 1000),
    spotifyId: t.id,
    previewUrl: t.preview_url ?? undefined,
  };
}

// --- API Methods ---

export async function searchTracks(query: string, limit = 20): Promise<Track[]> {
  const data = await spotifyFetch<SpotifySearchResult>('/search', {
    q: query,
    type: 'track',
    limit: String(limit),
    market: 'US',
  });
  return (data.tracks?.items ?? []).map(normalizeTrack);
}

export async function searchAll(
  query: string,
  limit = 10
): Promise<{ tracks: Track[]; albums: SpotifyAlbum[]; artists: SpotifyArtist[] }> {
  const data = await spotifyFetch<SpotifySearchResult>('/search', {
    q: query,
    type: 'track,album,artist',
    limit: String(limit),
    market: 'US',
  });
  return {
    tracks: (data.tracks?.items ?? []).map(normalizeTrack),
    albums: data.albums?.items ?? [],
    artists: data.artists?.items ?? [],
  };
}

export async function getTrack(id: string): Promise<Track> {
  const data = await spotifyFetch<SpotifyTrack>(`/tracks/${id}`);
  return normalizeTrack(data);
}

export async function getAlbum(id: string): Promise<SpotifyAlbum> {
  return spotifyFetch<SpotifyAlbum>(`/albums/${id}`);
}

export async function getAlbumTracks(id: string): Promise<Track[]> {
  const album = await getAlbum(id);
  return album.tracks.items.map((t) => ({
    ...normalizeTrack(t),
    album: album.name,
    albumId: album.id,
    coverUrl: album.images[0]?.url ?? '',
  }));
}

export async function getArtist(id: string): Promise<SpotifyArtist> {
  return spotifyFetch<SpotifyArtist>(`/artists/${id}`);
}

export async function getArtistTopTracks(id: string): Promise<Track[]> {
  const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(`/artists/${id}/top-tracks`, {
    market: 'US',
  });
  return data.tracks.map(normalizeTrack);
}

export async function getArtistAlbums(id: string, limit = 20): Promise<SpotifyAlbum[]> {
  const data = await spotifyFetch<{ items: SpotifyAlbum[] }>(`/artists/${id}/albums`, {
    limit: String(limit),
    include_groups: 'album,single',
    market: 'US',
  });
  return data.items;
}

export async function getRecommendations(options: {
  seedTracks?: string[];
  seedArtists?: string[];
  seedGenres?: string[];
  limit?: number;
}): Promise<Track[]> {
  const params: Record<string, string> = {
    limit: String(options.limit ?? 20),
    market: 'US',
  };
  if (options.seedTracks?.length) params.seed_tracks = options.seedTracks.slice(0, 5).join(',');
  if (options.seedArtists?.length) params.seed_artists = options.seedArtists.slice(0, 5).join(',');
  if (options.seedGenres?.length) params.seed_genres = options.seedGenres.slice(0, 5).join(',');

  // Need at least one seed
  if (!params.seed_tracks && !params.seed_artists && !params.seed_genres) {
    params.seed_genres = 'pop,rock,hip-hop';
  }

  const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>('/recommendations', params);
  return data.tracks.map(normalizeTrack);
}

export async function getNewReleases(limit = 20): Promise<SpotifyAlbum[]> {
  const data = await spotifyFetch<{ albums: { items: SpotifyAlbum[] } }>('/browse/new-releases', {
    limit: String(limit),
    country: 'US',
  });
  return data.albums.items;
}

export async function getCategories(limit = 20): Promise<SpotifyCategory[]> {
  const data = await spotifyFetch<{ categories: { items: SpotifyCategory[] } }>(
    '/browse/categories',
    { limit: String(limit), country: 'US', locale: 'en_US' }
  );
  return data.categories.items;
}

export async function getFeaturedPlaylists(limit = 20) {
  const data = await spotifyFetch<{
    playlists: {
      items: {
        id: string;
        name: string;
        description: string;
        images: { url: string }[];
      }[];
    };
  }>('/browse/featured-playlists', { limit: String(limit), country: 'US' });
  return data.playlists.items;
}

export async function getAvailableGenreSeeds(): Promise<string[]> {
  const data = await spotifyFetch<{ genres: string[] }>('/recommendations/available-genre-seeds');
  return data.genres;
}
