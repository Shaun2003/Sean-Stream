"use client";

import { apiCache, getCacheKey } from "./api-cache";

export interface YouTubeVideo {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
}

export interface PlaylistItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  itemCount?: number;
}

export interface YouTubeSearchResult {
  videos: YouTubeVideo[];
  playlists?: PlaylistItem[];
  nextPageToken?: string;
}

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

/**
 * Validates if a string is a valid YouTube video ID
 * YouTube video IDs are exactly 11 characters long and contain alphanumeric, hyphen, and underscore
 */
export function isValidYouTubeVideoId(videoId: string | undefined | null): boolean {
  if (!videoId || typeof videoId !== 'string') {
    return false;
  }

  const trimmedId = videoId.trim();
  // YouTube video IDs are exactly 11 characters and contain only alphanumeric, hyphen, and underscore
  const youtubeIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  return youtubeIdRegex.test(trimmedId);
}

export async function searchYouTube(
  query: string,
  pageToken?: string
): Promise<YouTubeSearchResult> {
  if (!YOUTUBE_API_KEY) {
    console.error("[v0] YouTube API key not configured");
    return { videos: [], playlists: [] };
  }

  try {
    // Check cache (don't cache paginated results, only first page)
    const cacheKey = getCacheKey("search-youtube", { query });
    if (!pageToken) {
      const cached = apiCache.get<YouTubeSearchResult>(cacheKey);
      if (cached) {
        console.log("[v0] Search cache hit:", query);
        return cached;
      }
    }

    const params = new URLSearchParams({
      part: "snippet",
      q: `${query} official audio`,
      type: "video,playlist",
      maxResults: "20",
      key: YOUTUBE_API_KEY,
    });

    if (pageToken) {
      params.append("pageToken", pageToken);
    }

    const searchResponse = await fetch(
      `${YOUTUBE_API_BASE}/search?${params.toString()}`
    );

    if (!searchResponse.ok) {
      throw new Error(`YouTube search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    // Separate videos and playlists
    const videoItems = searchData.items.filter(
      (item: { id: { kind: string } }) => item.id.kind === "youtube#video"
    );
    const playlistItems = searchData.items.filter(
      (item: { id: { kind: string } }) => item.id.kind === "youtube#playlist"
    );

    const videoIds = videoItems
      .map((item: { id: { videoId: string } }) => item.id.videoId)
      .join(",");

    const playlists: PlaylistItem[] = playlistItems.map(
      (item: {
        id: { playlistId: string };
        snippet: {
          title: string;
          description: string;
          channelTitle: string;
          thumbnails: { high: { url: string } };
        };
      }) => ({
        id: item.id.playlistId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.high?.url || "",
        channelTitle: item.snippet.channelTitle,
      })
    );

    const videos: YouTubeVideo[] = [];
    
    if (videoIds) {
      // Get video details for duration
      const detailsResponse = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`
      );

      if (!detailsResponse.ok) {
        throw new Error(`YouTube details failed: ${detailsResponse.status}`);
      }

      const detailsData = await detailsResponse.json();

      const processedVideos = detailsData.items.map(
        (item: {
          id: string;
          snippet: {
            title: string;
            channelTitle: string;
            thumbnails: { high: { url: string } };
          };
          contentDetails: { duration: string };
        }) => {
          // Validate video ID - YouTube IDs must be exactly 11 chars
          if (!isValidYouTubeVideoId(item.id)) {
            console.warn("[v0] Skipping video with invalid ID format:", item.id);
            return null;
          }

          const title = item.snippet.title;
          const channelTitle = item.snippet.channelTitle;

          // Extract artist from title or use channel name
          let artist = channelTitle;
          if (title.includes(" - ")) {
            const parts = title.split(" - ");
            artist = parts[0].trim();
          } else if (title.includes(" | ")) {
            const parts = title.split(" | ");
            artist = parts[0].trim();
          }

          return {
            id: item.id,
            title: cleanTitle(title),
            artist: artist,
            thumbnail: item.snippet.thumbnails.high?.url || "",
            duration: parseDuration(item.contentDetails.duration),
            channelTitle,
          };
        }
      );
      
      // Filter out any null values (invalid videos)
      videos.push(...processedVideos.filter((v): v is YouTubeVideo => v !== null));
    }

    const result = {
      videos,
      playlists,
      nextPageToken: searchData.nextPageToken,
    };

    // Cache the result (don't cache paginated results)
    if (!pageToken) {
      apiCache.set(cacheKey, result);
    }

    return result;
  } catch (error) {
    console.error("[v0] YouTube search error:", error);
    return { videos: [], playlists: [] };
  }
}

export async function getTrendingMusic(): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    return [];
  }

  try {
    // Check cache - trending cache is valid for 1 hour (music doesn't change fast)
    const cacheKey = "trending-music";
    const cached = apiCache.get<YouTubeVideo[]>(cacheKey);
    if (cached) {
      console.log("[v0] Trending cache hit");
      return cached;
    }

    const response = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails&chart=mostPopular&regionCode=US&videoCategoryId=10&maxResults=20&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`YouTube trending failed: ${response.status}`);
    }

    const data = await response.json();

    const result = data.items.map(
      (item: {
        id: string;
        snippet: { title: string; channelTitle: string; thumbnails: { high: { url: string } } };
        contentDetails: { duration: string };
      }) => {
        const title = item.snippet.title;
        const channelTitle = item.snippet.channelTitle;
        
        let artist = channelTitle;
        if (title.includes(" - ")) {
          const parts = title.split(" - ");
          artist = parts[0].trim();
        }

        return {
          id: item.id,
          title: cleanTitle(title),
          artist,
          thumbnail: item.snippet.thumbnails.high?.url || "",
          duration: parseDuration(item.contentDetails.duration),
          channelTitle,
        };
      }
    );

    // Cache for 1 hour - trending doesn't change rapidly
    apiCache.set(cacheKey, result, 60 * 60 * 1000);
    return result;
  } catch (error) {
    console.error("[v0] YouTube trending error:", error);
    return [];
  }
}

export async function getPlaylistItems(
  playlistId: string,
  maxResults: number = 20
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    return [];
  }

  try {
    // Check cache - playlists are cached for 15 minutes
    const cacheKey = getCacheKey("playlist-items", { playlistId, maxResults });
    const cached = apiCache.get<YouTubeVideo[]>(cacheKey);
    if (cached) {
      console.log("[v0] Playlist cache hit:", playlistId);
      return cached;
    }

    const response = await fetch(
      `${YOUTUBE_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`YouTube playlist failed: ${response.status}`);
    }

    const data = await response.json();
    const videoIds = data.items
      .map((item: { contentDetails: { videoId: string } }) => item.contentDetails.videoId)
      .join(",");

    if (!videoIds) return [];

    const detailsResponse = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    );

    if (!detailsResponse.ok) {
      throw new Error(`YouTube video details failed: ${detailsResponse.status}`);
    }

    const detailsData = await detailsResponse.json();

    return detailsData.items
      .map(
        (item: {
          id: string;
          snippet: { title: string; channelTitle: string; thumbnails: { high: { url: string } } };
          contentDetails: { duration: string };
        }) => {
          // Validate video ID - YouTube IDs must be exactly 11 chars
          if (!isValidYouTubeVideoId(item.id)) {
            console.warn("[v0] Skipping playlist item with invalid ID format:", item.id);
            return null;
          }

          const title = item.snippet.title;
          const channelTitle = item.snippet.channelTitle;

          let artist = channelTitle;
          if (title.includes(" - ")) {
            const parts = title.split(" - ");
            artist = parts[0].trim();
          }

          return {
            id: item.id,
            title: cleanTitle(title),
            artist,
            thumbnail: item.snippet.thumbnails.high?.url || "",
            duration: parseDuration(item.contentDetails.duration),
            channelTitle,
          };
        }
      )
      .filter((v): v is YouTubeVideo => v !== null);

    // Cache playlist for 15 minutes
    apiCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[v0] YouTube playlist error:", error);
    return [];
  }
}

function cleanTitle(title: string): string {
  // Remove common suffixes like (Official Video), [Lyrics], etc.
  return title
    .replace(/\(Official\s*(Music\s*)?Video\)/gi, "")
    .replace(/\[Official\s*(Music\s*)?Video\]/gi, "")
    .replace(/\(Official\s*Audio\)/gi, "")
    .replace(/\[Official\s*Audio\]/gi, "")
    .replace(/\(Lyrics?\)/gi, "")
    .replace(/\[Lyrics?\]/gi, "")
    .replace(/\(Audio\)/gi, "")
    .replace(/\[Audio\]/gi, "")
    .replace(/\|.*$/g, "")
    .replace(/\s+-\s+[^-]+$/, "")
    .trim();
}

function parseDuration(duration: string): string {
  // Parse ISO 8601 duration (PT3M45S) to readable format (3:45)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function durationToSeconds(duration: string): number {
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] * 60 + (parts[1] || 0);
}
