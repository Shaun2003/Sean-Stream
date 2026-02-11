"use server";

import { createServerClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/database.types";

export type Artist = Database["public"]["Tables"]["artists"]["Row"];
export type Album = Database["public"]["Tables"]["albums"]["Row"];

export async function searchArtists(query: string): Promise<Artist[]> {
  if (!query) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("artists")
    .select("*")
    .ilike("name", `%${query}%`)
    .limit(10);

  if (error) {
    console.error("Error searching artists:", error);
    return [];
  }
  return data;
}

export async function searchAlbums(query: string): Promise<Album[]> {
  if (!query) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .ilike("name", `%${query}%`)
    .limit(10);

  if (error) {
    console.error("Error searching albums:", error);
    return [];
  }
  return data;
}