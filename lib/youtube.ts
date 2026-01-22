"use client";

export interface YouTubeVideo {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
}

export interface YouTubeSearchResult {
  videos: YouTubeVideo[];
  nextPageToken?: string;
}

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export async function searchYouTube(
  query: string,
  pageToken?: string
): Promise<YouTubeSearchResult> {
  if (!YOUTUBE_API_KEY) {
    console.error("[v0] YouTube API key not configured");
    return { videos: [] };
  }

  try {
    const params = new URLSearchParams({
      part: "snippet",
      q: `${query} official audio`,
      type: "video",
      videoCategoryId: "10", // Music category
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
    const videoIds = searchData.items
      .map((item: { id: { videoId: string } }) => item.id.videoId)
      .join(",");

    // Get video details for duration
    const detailsResponse = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    );

    if (!detailsResponse.ok) {
      throw new Error(`YouTube details failed: ${detailsResponse.status}`);
    }

    const detailsData = await detailsResponse.json();

    const videos: YouTubeVideo[] = detailsData.items.map(
      (item: {
        id: string;
        snippet: { title: string; channelTitle: string; thumbnails: { high: { url: string } } };
        contentDetails: { duration: string };
      }) => {
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

    return {
      videos,
      nextPageToken: searchData.nextPageToken,
    };
  } catch (error) {
    console.error("[v0] YouTube search error:", error);
    return { videos: [] };
  }
}

export async function getTrendingMusic(): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    return [];
  }

  try {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails&chart=mostPopular&regionCode=US&videoCategoryId=10&maxResults=20&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`YouTube trending failed: ${response.status}`);
    }

    const data = await response.json();

    return data.items.map(
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
  } catch (error) {
    console.error("[v0] YouTube trending error:", error);
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
