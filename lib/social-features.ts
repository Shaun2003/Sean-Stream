"use client";

import { supabase } from "./supabase/client";

export interface UserProfile {
  id: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  favoriteGenres?: string[];
  isPublic: boolean;
  socialLinks?: {
    spotify?: string;
    instagram?: string;
    twitter?: string;
  };
  followerCount: number;
  followingCount: number;
}

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  activityType: "liked_track" | "created_playlist" | "followed_user" | "added_to_playlist";
  activityData: Record<string, unknown>;
  createdAt: string;
}

export interface FollowUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isFollowing: boolean;
}

// User Profile Functions
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("users_profile")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;

    // Get follower/following counts
    const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", userId),
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", userId),
    ]);

    return {
      id: data.id,
      displayName: data.display_name,
      bio: data.bio,
      avatarUrl: data.avatar_url,
      favoriteGenres: data.favorite_genres,
      isPublic: data.is_public,
      socialLinks: data.social_links,
      followerCount: followerCount || 0,
      followingCount: followingCount || 0,
    };
  } catch (error) {
    console.error("[Social] Error getting user profile:", error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  try {
    const { error } = await supabase
      .from("users_profile")
      .update({
        display_name: updates.displayName,
        bio: updates.bio,
        avatar_url: updates.avatarUrl,
        favorite_genres: updates.favoriteGenres,
        is_public: updates.isPublic,
        social_links: updates.socialLinks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;
    return getUserProfile(userId);
  } catch (error) {
    console.error("[Social] Error updating profile:", error);
    return null;
  }
}

// Follow Functions
export async function followUser(followingId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("followers").insert({
      follower_id: (await supabase.auth.getUser()).data.user?.id,
      following_id: followingId,
    });

    if (error) throw error;

    // Create activity
    const currentUser = (await supabase.auth.getUser()).data.user;
    await supabase.from("activity_feed").insert({
      user_id: followingId,
      activity_type: "followed_user",
      activity_data: {
        follower_id: currentUser?.id,
        follower_name: currentUser?.email,
      },
    });

    return true;
  } catch (error) {
    console.error("[Social] Error following user:", error);
    return false;
  }
}

export async function unfollowUser(followingId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("followers")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", followingId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[Social] Error unfollowing user:", error);
    return false;
  }
}

export async function isFollowing(followingId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from("followers")
      .select("*")
      .eq("follower_id", user.id)
      .eq("following_id", followingId)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

// Activity Feed Functions
export async function getActivityFeed(userId?: string): Promise<ActivityItem[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetId = userId || user?.id;

    if (!targetId) return [];

    const { data, error } = await supabase
      .from("activity_feed")
      .select("*")
      .eq("user_id", targetId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return (
      data?.map((item: unknown) => {
        const record = item as Record<string, unknown>;
        return {
          id: record.id as string,
          userId: record.user_id as string,
          userName: record.activity_data && typeof record.activity_data === 'object' 
            ? (record.activity_data as Record<string, unknown>).user_name as string
            : "Unknown User",
          activityType: record.activity_type as ActivityItem["activityType"],
          activityData: record.activity_data as Record<string, unknown>,
          createdAt: record.created_at as string,
        };
      }) || []
    );
  } catch (error) {
    console.error("[Social] Error getting activity feed:", error);
    return [];
  }
}

export async function createActivity(
  activityType: ActivityItem["activityType"],
  activityData: Record<string, unknown>
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from("activity_feed").insert({
      user_id: user.id,
      activity_type: activityType,
      activity_data: activityData,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[Social] Error creating activity:", error);
    return false;
  }
}

// Follower Recommendations
export async function getFollowRecommendations(): Promise<FollowUser[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get users the current user is already following
    const { data: following } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = following?.map((f: Record<string, unknown>) => f.following_id) || [];

    // Get recommendations: users followed by followed users
    const { data: profiles, error } = await supabase
      .from("users_profile")
      .select("id, display_name, avatar_url")
      .eq("is_public", true)
      .neq("id", user.id)
      .limit(10);

    if (error) throw error;

    return (profiles || []).map((profile: Record<string, unknown>) => ({
      id: profile.id as string,
      displayName: profile.display_name as string,
      avatarUrl: profile.avatar_url as string | undefined,
      isFollowing: followingIds.includes(profile.id),
    }));
  } catch (error) {
    console.error("[Social] Error getting recommendations:", error);
    return [];
  }
}
