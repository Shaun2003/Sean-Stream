"use client";

import { supabase } from "./supabase/client";
import type { YouTubeVideo } from "./youtube";
import { searchYouTube } from "./youtube";

export interface Recommendation {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  reason: string;
  score: number; // 0-1
  viewedAt?: string;
  createdAt: string;
}

export type RecommendationReason =
  | "similar-to-liked"
  | "trending-in-genre"
  | "popular-with-follows"
  | "similar-artist"
  | "algorithm";

const RECOMMENDATION_CACHE_KEY = "pulse-recommendations";

export async function generatePersonalRecommendations(): Promise<YouTubeVideo[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get user's top tracks and artists
    const { data: topTracks } = await supabase
      .from("listening_stats")
      .select("*")
      .eq("user_id", user.id)
      .order("play_count", { ascending: false })
      .limit(10);

    if (!topTracks || topTracks.length === 0) return [];

    const recommendations = new Map<string, YouTubeVideo>();
    const artistGenres = new Set<string>();

    // Generate recommendations based on top tracks
    for (const track of topTracks) {
      const queries = [
        `${track.artist} similar artists`,
        `songs like ${track.title}`,
        `${track.artist} popular songs`,
      ];

      for (const query of queries) {
        try {
          const results = await searchYouTube(query);
          for (const track of results.videos) {
            if (!recommendations.has(track.id)) {
              recommendations.set(track.id, track);
              if (recommendations.size >= 30) break;
            }
          }
        } catch (error) {
          console.error(`[Recommendations] Error searching "${query}":`, error);
        }

        if (recommendations.size >= 30) break;
      }
      if (recommendations.size >= 30) break;
    }

    // Save recommendations to database
    for (const [trackId, track] of Array.from(recommendations.entries()).slice(0, 20)) {
      const score = Math.random() * 0.5 + 0.5; // Score between 0.5-1.0
      await supabase.from("recommendations").insert({
        user_id: user.id,
        recommended_track_id: trackId,
        title: track.title,
        artist: track.channelTitle,
        reason: "similar-to-liked",
        score,
      });
    }

    return Array.from(recommendations.values()).slice(0, 20);
  } catch (error) {
    console.error("[Recommendations] Error generating recommendations:", error);
    return [];
  }
}

export async function getRecommendations(): Promise<Recommendation[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Check cache first
    const cached = localStorage.getItem(`${RECOMMENDATION_CACHE_KEY}-${user.id}`);
    if (cached) {
      const data = JSON.parse(cached) as Recommendation[];
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (new Date(data[0]?.createdAt).getTime() > oneHourAgo) {
        return data;
      }
    }

    const { data, error } = await supabase
      .from("recommendations")
      .select("*")
      .eq("user_id", user.id)
      .is("viewed_at", null)
      .order("score", { ascending: false })
      .limit(20);

    if (error) throw error;

    const recommendations: Recommendation[] = (data || []).map((item: unknown) => {
      const record = item as Record<string, unknown>;
      return {
        id: record.id as string,
        trackId: record.recommended_track_id as string,
        title: record.title as string,
        artist: record.artist as string,
        reason: (record.reason as RecommendationReason) || "algorithm",
        score: record.score as number,
        viewedAt: record.viewed_at as string | undefined,
        createdAt: record.created_at as string,
      };
    });

    localStorage.setItem(
      `${RECOMMENDATION_CACHE_KEY}-${user.id}`,
      JSON.stringify(recommendations)
    );

    return recommendations;
  } catch (error) {
    console.error("[Recommendations] Error getting recommendations:", error);
    return [];
  }
}

export async function markRecommendationAsViewed(
  recommendationId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("recommendations")
      .update({ viewed_at: new Date().toISOString() })
      .eq("id", recommendationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[Recommendations] Error marking as viewed:", error);
    return false;
  }
}

export async function dismissRecommendation(
  recommendationId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("recommendations")
      .delete()
      .eq("id", recommendationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[Recommendations] Error dismissing recommendation:", error);
    return false;
  }
}

export async function getTrendingRecommendations(): Promise<YouTubeVideo[]> {
  try {
    const trendingQueries = [
      "trending music 2024",
      "viral songs right now",
      "top songs this week",
      "viral tiktok songs",
      "chart topping hits",
    ];

    const allTracks = new Map<string, YouTubeVideo>();

    for (const query of trendingQueries) {
      try {
        const results = await searchYouTube(query);
        for (const track of results.videos) {
          if (!allTracks.has(track.id)) {
            allTracks.set(track.id, track);
            if (allTracks.size >= 30) break;
          }
        }
      } catch (error) {
        console.error(`[Trending] Error searching "${query}":`, error);
      }

      if (allTracks.size >= 30) break;
    }

    return Array.from(allTracks.values()).slice(0, 30);
  } catch (error) {
    console.error("[Recommendations] Error getting trending:", error);
    return [];
  }
}

export function getRecommendationReason(reason: RecommendationReason): string {
  const reasons: Record<RecommendationReason, string> = {
    "similar-to-liked": "Based on your favorite tracks",
    "trending-in-genre": "Trending in your favorite genre",
    "popular-with-follows": "Popular with artists you follow",
    "similar-artist": "Similar to artists you like",
    algorithm: "Recommended for you",
  };
  return reasons[reason];
}
