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
  user_id: string;
  activity_type: "liked_track" | "created_playlist" | "followed_user" | "added_to_playlist";
  metadata?: Record<string, unknown>;
  created_at: string;
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
      metadata: {
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
      data?.map((item: Record<string, unknown>) => ({
        id: item.id as string,
        user_id: item.user_id as string,
        activity_type: item.activity_type as ActivityItem["activity_type"],
        metadata: item.metadata as Record<string, unknown> | undefined,
        created_at: item.created_at as string,
      })) || []
    );
  } catch (error) {
    console.error("[Social] Error getting activity feed:", error);
    return [];
  }
}

export async function createActivity(
  activityType: ActivityItem["activity_type"],
  metadata: Record<string, unknown>
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from("activity_feed").insert({
      user_id: user.id,
      activity_type: activityType,
      metadata: metadata,
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

// Get followers
export async function getFollowers(): Promise<FollowUser[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get all users following current user
    const { data: followers, error: followersError } = await supabase
      .from("followers")
      .select("follower_id")
      .eq("following_id", user.id);

    if (followersError) throw followersError;

    const followerIds = followers?.map((f: Record<string, unknown>) => f.follower_id) || [];

    if (followerIds.length === 0) return [];

    // Get follower profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", followerIds);

    if (profilesError) throw profilesError;

    return (profiles || []).map((profile: Record<string, unknown>) => ({
      id: profile.id as string,
      displayName: profile.display_name as string || "User",
      avatarUrl: profile.avatar_url as string | undefined,
      isFollowing: true,
    }));
  } catch (error) {
    console.error("[Social] Error getting followers:", error);
    return [];
  }
}

// Get following list
export async function getFollowing(): Promise<FollowUser[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get all users current user is following
    const { data: following, error: followingError } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", user.id);

    if (followingError) throw followingError;

    const followingIds = following?.map((f: Record<string, unknown>) => f.following_id) || [];

    if (followingIds.length === 0) return [];

    // Get following profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", followingIds);

    if (profilesError) throw profilesError;

    return (profiles || []).map((profile: Record<string, unknown>) => ({
      id: profile.id as string,
      displayName: profile.display_name as string || "User",
      avatarUrl: profile.avatar_url as string | undefined,
      isFollowing: true,
    }));
  } catch (error) {
    console.error("[Social] Error getting following list:", error);
    return [];
  }
}

// Search for users
export async function searchUsers(query: string): Promise<FollowUser[]> {
  try {
    if (!query.trim()) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get current user's following list
    const { data: following } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = following?.map((f: Record<string, unknown>) => f.following_id) || [];

    // Search in profiles table
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .neq("id", user.id)
      .ilike("display_name", `%${query}%`)
      .limit(20);

    if (error) throw error;

    return (profiles || []).map((profile: Record<string, unknown>) => ({
      id: profile.id as string,
      displayName: profile.display_name as string || "User",
      avatarUrl: profile.avatar_url as string | undefined,
      isFollowing: followingIds.includes(profile.id as string),
    }));
  } catch (error) {
    console.error("[Social] Error searching users:", error);
    return [];
  }
}

// Theme Preference Functions
export async function saveThemePreference(theme: "light" | "dark"): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ theme_preference: theme })
      .eq("id", user.id);

    if (error) throw error;
  } catch (error) {
    console.error("[Theme] Error saving theme preference:", error);
  }
}

export async function getThemePreference(): Promise<"light" | "dark" | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("theme_preference")
      .eq("id", user.id)
      .single();

    if (error) throw error;
    return data?.theme_preference || null;
  } catch (error) {
    console.error("[Theme] Error loading theme preference:", error);
    return null;
  }
}
