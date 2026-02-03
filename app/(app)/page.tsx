"use client";

import { useEffect, useState } from "react";
import { getTrendingMusic, type YouTubeVideo } from "@/lib/youtube";
import { getRecentlyPlayed, getLikedTracks } from "@/lib/offline-storage";
import { usePlayer, type Song } from "@/contexts/player-context";
import { TrackCard } from "@/components/music/track-card";
import { TrackRow } from "@/components/music/track-row";
import { Skeleton } from "@/components/ui/skeleton";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [trending, setTrending] = useState<YouTubeVideo[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<YouTubeVideo[]>([]);
  const [likedTracks, setLikedTracks] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playQueue, currentSong, isPlaying } = usePlayer();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [trendingData, recentData, likedData] = await Promise.all([
          getTrendingMusic(),
          getRecentlyPlayed(),
          getLikedTracks(),
        ]);
        setTrending(trendingData);
        setRecentlyPlayed(recentData);
        setLikedTracks(likedData);
      } catch (error) {
        console.error("[v0] Error loading home data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const handlePlayAll = (tracks: YouTubeVideo[]) => {
    if (tracks.length > 0) {
      playQueue(tracks as Song[]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">{getGreeting()}</h1>
      </div>

      {/* Quick Picks - Compact grid for fast access */}
      {(recentlyPlayed.length > 0 || likedTracks.length > 0) && (
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
            {[...recentlyPlayed.slice(0, 3), ...likedTracks.slice(0, 3)]
              .filter((track, index, self) => self.findIndex((t) => t.id === track.id) === index)
              .slice(0, 6)
              .map((track) => (
                <QuickPickCard
                  key={track.id}
                  track={track}
                  isPlaying={currentSong?.id === track.id && isPlaying}
                />
              ))}
          </div>
        </section>
      )}

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Recently Played</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => handlePlayAll(recentlyPlayed)}
            >
              Play all
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recentlyPlayed.slice(0, 6).map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </section>
      )}

      {/* Trending Now */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Trending Now</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => handlePlayAll(trending)}
          >
            Play all
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {trending.slice(0, 12).map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      </section>

      {/* Liked Songs */}
      {likedTracks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Your Favorites</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => handlePlayAll(likedTracks)}
            >
              Play all
            </Button>
          </div>
          <div className="space-y-1">
            {likedTracks.slice(0, 5).map((track, index) => (
              <TrackRow key={track.id} track={track} index={index + 1} />
            ))}
          </div>
        </section>
      )}

      {/* More Trending */}
      {trending.length > 12 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Discover More</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {trending.slice(12).map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function QuickPickCard({
  track,
  isPlaying,
}: {
  track: YouTubeVideo;
  isPlaying: boolean;
}) {
  const { playSong } = usePlayer();

  return (
    <button
      onClick={() => playSong(track as Song)}
      className="flex items-center gap-3 p-2 rounded-md bg-card/60 hover:bg-card transition-all group"
    >
      <div className="w-12 h-12 rounded overflow-hidden bg-secondary shrink-0 relative">
        {track.thumbnail ? (
          <img
            src={track.thumbnail || "/placeholder.svg"}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/30 to-primary/10">
            <span className="text-lg font-bold text-primary">
              {track.title[0]}
            </span>
          </div>
        )}
        {isPlaying && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <div className="flex gap-0.5">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full animate-pulse"
                  style={{
                    height: `${8 + Math.random() * 8}px`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <h3 className="font-semibold text-sm text-foreground truncate">
          {track.title}
        </h3>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <Play className="w-4 h-4 fill-primary-foreground text-primary-foreground ml-0.5" />
        </div>
      </div>
    </button>
  );
}

