"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, Zap, Radio, Sparkles } from "lucide-react";
import { getMoodPlaylists, generateMoodPlaylist, type MoodPlaylist } from "@/lib/mood-playlists";
import { useEnhancedPlayer } from "@/contexts/enhanced-player-context";
import { useToast } from "@/hooks/use-toast";

const MOOD_EMOJIS: Record<string, string> = {
  chill: "😎",
  workout: "💪",
  focus: "🧠",
  party: "🎉",
  romantic: "💕",
  sad: "😢",
  happy: "😊",
};

const MOOD_COLORS: Record<string, string> = {
  chill: "from-blue-500 to-cyan-500",
  workout: "from-red-500 to-orange-500",
  focus: "from-purple-500 to-indigo-500",
  party: "from-pink-500 to-purple-500",
  romantic: "from-rose-500 to-pink-500",
  sad: "from-slate-500 to-blue-500",
  happy: "from-yellow-500 to-orange-500",
};

export default function MoodPlaylistsPage() {
  const { playQueue } = useEnhancedPlayer();
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<MoodPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingMood, setGeneratingMood] = useState<string | null>(null);

  useEffect(() => {
    loadMoodPlaylists();
  }, []);

  const loadMoodPlaylists = async () => {
    try {
      setIsLoading(true);
      const data = getMoodPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error("Error loading mood playlists:", error);
      toast({
        title: "Error",
        description: "Failed to load mood playlists",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMood = async (mood: string) => {
    try {
      setGeneratingMood(mood);
      const playlist = await generateMoodPlaylist(mood as any);
      setPlaylists((prev) => {
        const filtered = prev.filter((p) => p.mood !== mood);
        return [playlist, ...filtered];
      });
      toast({
        title: "Success",
        description: `${mood} playlist generated`,
      });
    } catch (error) {
      console.error("Error generating mood playlist:", error);
      toast({
        title: "Error",
        description: `Failed to generate ${mood} playlist`,
        variant: "destructive",
      });
    } finally {
      setGeneratingMood(null);
    }
  };

  const handlePlayMood = (playlist: MoodPlaylist) => {
    if (playlist.tracks.length > 0) {
      playQueue(
        playlist.tracks.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.channelTitle,
          image: t.thumbnail.url,
        }))
      );
      toast({
        title: "Now Playing",
        description: `${playlist.name} playlist`,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <h1 className="text-3xl font-bold mb-8">Mood Playlists</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          Mood Playlists
        </h1>
        <p className="text-muted-foreground mt-2">
          Playlists tailored to your current mood
        </p>
      </div>

      <div className="space-y-8">
        {/* Active Playlists */}
        {playlists.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Your Playlists</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {playlists.map((playlist) => (
                <Card
                  key={playlist.id}
                  className={`overflow-hidden bg-gradient-to-br ${
                    MOOD_COLORS[playlist.mood]
                  } p-6 text-white cursor-pointer hover:shadow-lg transition`}
                  onClick={() => handlePlayMood(playlist)}
                >
                  <div className="space-y-4">
                    <div className="text-4xl">
                      {MOOD_EMOJIS[playlist.mood]}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{playlist.name}</h3>
                      <p className="text-sm opacity-90">
                        {playlist.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <span className="text-sm opacity-75">
                        {playlist.tracks.length} tracks
                      </span>
                      <Music className="w-5 h-5" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Generate New Moods */}
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Generate New Playlists
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(MOOD_EMOJIS).map(([mood, emoji]) => {
              const exists = playlists.some((p) => p.mood === mood);
              return (
                <Button
                  key={mood}
                  variant={exists ? "default" : "outline"}
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => handleGenerateMood(mood)}
                  disabled={generatingMood === mood}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="capitalize">{mood}</span>
                  {generatingMood === mood && (
                    <Zap className="w-4 h-4 animate-pulse" />
                  )}
                </Button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
