export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          activity_data: Json
          activity_type: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          activity_data: Json
          activity_type: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          activity_data?: Json
          activity_type?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      albums: {
        Row: {
          artist_id: string | null
          cover_url: string | null
          created_at: string | null
          id: string
          name: string
          release_year: number | null
        }
        Insert: {
          artist_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          id?: string
          name: string
          release_year?: number | null
        }
        Update: {
          artist_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          id?: string
          name?: string
          release_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "albums_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_followers: {
        Row: {
          artist_id: string
          created_at: string | null
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_followers_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      bookmarked_tracks: {
        Row: {
          artist: string | null
          bookmarked_at: string | null
          duration: number | null
          id: string
          thumbnail: string | null
          title: string | null
          updated_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          artist?: string | null
          bookmarked_at?: string | null
          duration?: number | null
          id?: string
          thumbnail?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          artist?: string | null
          bookmarked_at?: string | null
          duration?: number | null
          id?: string
          thumbnail?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      liked_songs: {
        Row: {
          id: string
          liked_at: string | null
          song_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          liked_at?: string | null
          song_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          liked_at?: string | null
          song_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liked_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liked_songs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      liked_tracks: {
        Row: {
          added_at: string | null
          artist: string | null
          duration: number | null
          id: string
          thumbnail: string | null
          title: string | null
          updated_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          added_at?: string | null
          artist?: string | null
          duration?: number | null
          id?: string
          thumbnail?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          added_at?: string | null
          artist?: string | null
          duration?: number | null
          id?: string
          thumbnail?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      listening_stats: {
        Row: {
          artist: string | null
          created_at: string | null
          first_played_at: string | null
          id: number
          last_played_at: string | null
          liked_at: string | null
          play_count: number | null
          title: string | null
          total_listening_time: number | null
          track_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          artist?: string | null
          created_at?: string | null
          first_played_at?: string | null
          id?: number
          last_played_at?: string | null
          liked_at?: string | null
          play_count?: number | null
          title?: string | null
          total_listening_time?: number | null
          track_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          artist?: string | null
          created_at?: string | null
          first_played_at?: string | null
          id?: number
          last_played_at?: string | null
          liked_at?: string | null
          play_count?: number | null
          title?: string | null
          total_listening_time?: number | null
          track_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mood_playlists: {
        Row: {
          created_at: string | null
          id: string
          mood: string
          mood_data: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mood: string
          mood_data: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mood?: string
          mood_data?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      playback_history: {
        Row: {
          artist: string | null
          duration_seconds: number | null
          id: string
          played_at: string | null
          position_seconds: number | null
          thumbnail: string | null
          title: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          artist?: string | null
          duration_seconds?: number | null
          id?: string
          played_at?: string | null
          position_seconds?: number | null
          thumbnail?: string | null
          title?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          artist?: string | null
          duration_seconds?: number | null
          id?: string
          played_at?: string | null
          position_seconds?: number | null
          thumbnail?: string | null
          title?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      playback_state: {
        Row: {
          current_song_id: string | null
          is_playing: boolean | null
          position: number | null
          repeat_mode: string | null
          shuffle_enabled: boolean | null
          updated_at: string | null
          user_id: string
          volume: number | null
        }
        Insert: {
          current_song_id?: string | null
          is_playing?: boolean | null
          position?: number | null
          repeat_mode?: string | null
          shuffle_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          volume?: number | null
        }
        Update: {
          current_song_id?: string | null
          is_playing?: boolean | null
          position?: number | null
          repeat_mode?: string | null
          shuffle_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "playback_state_current_song_id_fkey"
            columns: ["current_song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playback_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_collaborators: {
        Row: {
          added_at: string | null
          can_edit: boolean | null
          id: string
          playlist_id: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          can_edit?: boolean | null
          id?: string
          playlist_id: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          can_edit?: boolean | null
          id?: string
          playlist_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_collaborators_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_songs: {
        Row: {
          added_at: string | null
          artist: string | null
          duration: number | null
          id: string
          playlist_id: string | null
          position: number
          song_id: string | null
          thumbnail: string | null
          title: string | null
          video_id: string
        }
        Insert: {
          added_at?: string | null
          artist?: string | null
          duration?: number | null
          id?: string
          playlist_id?: string | null
          position: number
          song_id?: string | null
          thumbnail?: string | null
          title?: string | null
          video_id?: string
        }
        Update: {
          added_at?: string | null
          artist?: string | null
          duration?: number | null
          id?: string
          playlist_id?: string | null
          position?: number
          song_id?: string | null
          thumbnail?: string | null
          title?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_songs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          cover_color: string | null
          cover_gradient: string | null
          cover_image_url: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_collaborative: boolean | null
          is_public: boolean | null
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cover_color?: string | null
          cover_gradient?: string | null
          cover_image_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_collaborative?: boolean | null
          is_public?: boolean | null
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cover_color?: string | null
          cover_gradient?: string | null
          cover_image_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_collaborative?: boolean | null
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          streaming_quality: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          streaming_quality?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          streaming_quality?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      radio_stations: {
        Row: {
          base_song_artist: string
          base_song_id: string
          base_song_title: string
          created_at: string | null
          id: string
          queue_data: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_song_artist: string
          base_song_id: string
          base_song_title: string
          created_at?: string | null
          id?: string
          queue_data?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_song_artist?: string
          base_song_id?: string
          base_song_title?: string
          created_at?: string | null
          id?: string
          queue_data?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recently_played: {
        Row: {
          id: string
          played_at: string | null
          song_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          played_at?: string | null
          song_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          played_at?: string | null
          song_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recently_played_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recently_played_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          artist: string | null
          created_at: string | null
          id: string
          reason: string | null
          recommended_track_id: string
          score: number | null
          title: string | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          artist?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          recommended_track_id: string
          score?: number | null
          title?: string | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          artist?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          recommended_track_id?: string
          score?: number | null
          title?: string | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          id: string
          query: string
          searched_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          query: string
          searched_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          query?: string
          searched_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      songs: {
        Row: {
          album: string | null
          album_id: string | null
          artist: string
          artist_id: string | null
          audio_url: string | null
          cover_url: string | null
          created_at: string | null
          duration: number
          genre: string | null
          id: string
          play_count: number | null
          release_year: number | null
          title: string
        }
        Insert: {
          album?: string | null
          album_id?: string | null
          artist: string
          artist_id?: string | null
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          duration: number
          genre?: string | null
          id?: string
          play_count?: number | null
          release_year?: number | null
          title: string
        }
        Update: {
          album?: string | null
          album_id?: string | null
          artist?: string
          artist_id?: string | null
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          duration?: number
          genre?: string | null
          id?: string
          play_count?: number | null
          release_year?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "songs_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "songs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_queue: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          operation: string
          synced_at: string | null
          table_name: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          operation: string
          synced_at?: string | null
          table_name: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          operation?: string
          synced_at?: string | null
          table_name?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: []
      }
      track_lyrics: {
        Row: {
          artist: string
          created_at: string | null
          id: string
          lyrics: string | null
          lyrics_source: string | null
          synced_lyrics: Json | null
          title: string
          track_id: string
          updated_at: string | null
        }
        Insert: {
          artist: string
          created_at?: string | null
          id?: string
          lyrics?: string | null
          lyrics_source?: string | null
          synced_lyrics?: Json | null
          title: string
          track_id: string
          updated_at?: string | null
        }
        Update: {
          artist?: string
          created_at?: string | null
          id?: string
          lyrics?: string | null
          lyrics_source?: string | null
          synced_lyrics?: Json | null
          title?: string
          track_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          audio_quality: string | null
          created_at: string | null
          crossfade_duration: number | null
          equalizer_preset: string | null
          gapless_playback: boolean | null
          id: string
          playback_speed: number | null
          theme: string | null
          updated_at: string | null
        }
        Insert: {
          audio_quality?: string | null
          created_at?: string | null
          crossfade_duration?: number | null
          equalizer_preset?: string | null
          gapless_playback?: boolean | null
          id: string
          playback_speed?: number | null
          theme?: string | null
          updated_at?: string | null
        }
        Update: {
          audio_quality?: string | null
          created_at?: string | null
          crossfade_duration?: number | null
          equalizer_preset?: string | null
          gapless_playback?: boolean | null
          id?: string
          playback_speed?: number | null
          theme?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users_profile: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          favorite_genres: string[] | null
          id: string
          is_public: boolean | null
          social_links: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          favorite_genres?: string[] | null
          id: string
          is_public?: boolean | null
          social_links?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          favorite_genres?: string[] | null
          id?: string
          is_public?: boolean | null
          social_links?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
