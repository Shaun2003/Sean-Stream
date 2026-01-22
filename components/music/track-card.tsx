"use client";

import { Play, Pause } from "lucide-react";
import { usePlayer, type Song } from "@/contexts/player-context";
import type { YouTubeVideo } from "@/lib/youtube";
import { Button } from "@/components/ui/button";

interface TrackCardProps {
  track: YouTubeVideo;
  showArtist?: boolean;
}

export function TrackCard({ track, showArtist = true }: TrackCardProps) {
  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayer();

  const isCurrentTrack = currentSong?.id === track.id;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;

  const handlePlay = () => {
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      playSong(track as Song);
    }
  };

  return (
    <div className="group p-3 rounded-lg bg-card/40 hover:bg-card transition-all duration-200 cursor-pointer">
      <div className="relative aspect-square rounded-md overflow-hidden mb-3 bg-secondary shadow-lg">
        {track.thumbnail ? (
          <img
            src={track.thumbnail || "/placeholder.svg"}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
            <span className="text-4xl font-bold text-primary">
              {track.title[0]}
            </span>
          </div>
        )}

        {/* Play button overlay */}
        <div
          className={`absolute bottom-2 right-2 transition-all duration-200 ${
            isCurrentlyPlaying
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
          }`}
        >
          <Button
            size="icon"
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 shadow-xl transition-transform"
            onClick={handlePlay}
          >
            {isCurrentlyPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </Button>
        </div>

        {/* Playing indicator */}
        {isCurrentlyPlaying && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-primary">
            <div className="flex gap-0.5">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-primary-foreground rounded-full animate-pulse"
                  style={{
                    height: `${6 + Math.random() * 6}px`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div onClick={handlePlay}>
        <h3 className="font-semibold text-foreground text-sm line-clamp-1 mb-1">
          {track.title}
        </h3>
        {showArtist && (
          <p className="text-muted-foreground text-xs line-clamp-2">
            {track.artist}
          </p>
        )}
      </div>
    </div>
  );
}
