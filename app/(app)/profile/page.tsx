import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileContent } from "@/components/music/profile-content";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: likedSongs } = await supabase
    .from("liked_songs")
    .select("id")
    .eq("user_id", user.id);

  const { data: playlists } = await supabase
    .from("playlists")
    .select("id")
    .eq("user_id", user.id);

  return (
    <ProfileContent
      profile={{
        id: user.id,
        email: user.email || "",
        displayName:
          profile?.display_name || user.email?.split("@")[0] || "User",
        avatarUrl: profile?.avatar_url,
      }}
      stats={{
        likedSongs: likedSongs?.length || 0,
        playlists: playlists?.length || 0,
      }}
    />
  );
}
