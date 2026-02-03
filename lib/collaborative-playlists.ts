"use client";

import { supabase } from "./supabase/client";

export interface PlaylistCollaborator {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  canEdit: boolean;
  addedAt: string;
}

export async function addPlaylistCollaborator(
  playlistId: string,
  userId: string,
  canEdit: boolean = false
): Promise<boolean> {
  try {
    const { error } = await supabase.from("playlist_collaborators").insert({
      playlist_id: playlistId,
      user_id: userId,
      can_edit: canEdit,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[Collab] Error adding collaborator:", error);
    return false;
  }
}

export async function removePlaylistCollaborator(
  playlistId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("playlist_collaborators")
      .delete()
      .eq("playlist_id", playlistId)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[Collab] Error removing collaborator:", error);
    return false;
  }
}

export async function getPlaylistCollaborators(
  playlistId: string
): Promise<PlaylistCollaborator[]> {
  try {
    const { data, error } = await supabase
      .from("playlist_collaborators")
      .select("user_id, can_edit, added_at")
      .eq("playlist_id", playlistId);

    if (error) throw error;

    const collaborators: PlaylistCollaborator[] = [];

    for (const collab of data || []) {
      const { data: profile } = await supabase
        .from("users_profile")
        .select("display_name, avatar_url")
        .eq("id", collab.user_id)
        .single();

      if (profile) {
        collaborators.push({
          userId: collab.user_id,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          canEdit: collab.can_edit,
          addedAt: collab.added_at,
        });
      }
    }

    return collaborators;
  } catch (error) {
    console.error("[Collab] Error getting collaborators:", error);
    return [];
  }
}

export async function updateCollaboratorPermissions(
  playlistId: string,
  userId: string,
  canEdit: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("playlist_collaborators")
      .update({ can_edit: canEdit })
      .eq("playlist_id", playlistId)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[Collab] Error updating permissions:", error);
    return false;
  }
}

export async function makePlaylistPublic(
  playlistId: string,
  isPublic: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("playlists")
      .update({ is_public: isPublic })
      .eq("id", playlistId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[Collab] Error updating playlist visibility:", error);
    return false;
  }
}

export async function makePlaylistCollaborative(
  playlistId: string,
  isCollaborative: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("playlists")
      .update({ is_collaborative: isCollaborative })
      .eq("id", playlistId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[Collab] Error updating collaborative status:", error);
    return false;
  }
}
