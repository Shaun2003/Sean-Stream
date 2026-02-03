"use client";

import { useEffect, useState } from "react";
import { getMoodPlaylists, type MoodPlaylist } from "@/lib/mood-playlists";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePlayer, type Song } from "@/contexts/player-context";
import { Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function MoodPlaylistsWidget() {
  const [moods, setMoods] = useState<MoodPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playQueue } = usePlayer();

  useEffect(() => {
    try {
      const saved = getMoodPlaylists();
      setMoods(saved);
    } catch (error) {
      console.error("[Moods] Error loading moods:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (moods.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">
          No mood playlists yet. Create one from the Discover page!
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {moods.map((mood) => (
        <div
          key={mood.id}
          className="rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => playQueue(mood.tracks as Song[])}
        >
          <div
            className="h-40 flex items-center justify-center relative group"
            style={{
              background: mood.color,
            }}
          >
            <div className="text-4xl">{mood.emoji}</div>
            <Button
              size="icon"
              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                playQueue(mood.tracks as Song[]);
              }}
            >
              <Play className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-3 bg-card">
            <p className="font-semibold text-sm">{mood.name}</p>
            <p className="text-xs text-muted-foreground">{mood.tracks.length} songs</p>
          </div>
        </div>
      ))}
    </div>
  );
}
