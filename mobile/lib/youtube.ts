const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// In-memory cache for YouTube video IDs
const videoIdCache = new Map<string, string>();

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
}

/**
 * Search YouTube for a video matching the given query.
 * Returns the first result's video ID.
 */
export async function searchYouTubeVideo(query: string): Promise<string | null> {
  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  if (videoIdCache.has(cacheKey)) {
    return videoIdCache.get(cacheKey)!;
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: '1',
      videoCategoryId: '10', // Music category
      key: YOUTUBE_API_KEY,
    });

    const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);

    if (!response.ok) {
      console.error('YouTube API error:', response.status);
      return null;
    }

    const data = await response.json();
    const videoId = data.items?.[0]?.id?.videoId;

    if (videoId) {
      videoIdCache.set(cacheKey, videoId);
    }

    return videoId ?? null;
  } catch (error) {
    console.error('YouTube search error:', error);
    return null;
  }
}

/**
 * Resolve a Spotify track to a YouTube video ID.
 * Searches by "track name artist name" to find the best match.
 */
export async function resolveTrackToYouTube(
  title: string,
  artist: string
): Promise<string | null> {
  const query = `${title} ${artist} official audio`;
  return searchYouTubeVideo(query);
}

/**
 * Search YouTube and return multiple results.
 */
export async function searchYouTube(
  query: string,
  maxResults = 10
): Promise<YouTubeSearchResult[]> {
  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: String(maxResults),
      videoCategoryId: '10',
      key: YOUTUBE_API_KEY,
    });

    const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.items ?? []).map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url,
    }));
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

/**
 * Pre-cache a batch of tracks to YouTube IDs.
 * Useful when loading a playlist.
 */
export async function preCacheTrackIds(
  tracks: { title: string; artist: string }[]
): Promise<void> {
  const uncachedTracks = tracks.filter(
    (t) => !videoIdCache.has(`${t.title} ${t.artist} official audio`.toLowerCase().trim())
  );

  // Process in batches of 3 to avoid rate limiting
  for (let i = 0; i < uncachedTracks.length; i += 3) {
    const batch = uncachedTracks.slice(i, i + 3);
    await Promise.all(batch.map((t) => resolveTrackToYouTube(t.title, t.artist)));

    // Brief pause between batches
    if (i + 3 < uncachedTracks.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

/**
 * Get a cached YouTube video ID for a track.
 * Returns null if not cached (use resolveTrackToYouTube to fetch).
 */
export function getCachedVideoId(title: string, artist: string): string | null {
  const cacheKey = `${title} ${artist} official audio`.toLowerCase().trim();
  return videoIdCache.get(cacheKey) ?? null;
}

/**
 * Set a YouTube video ID in the cache (e.g., from SQLite).
 */
export function setCachedVideoId(title: string, artist: string, videoId: string): void {
  const cacheKey = `${title} ${artist} official audio`.toLowerCase().trim();
  videoIdCache.set(cacheKey, videoId);
}
