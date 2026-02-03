"use client";

import { Play, Pause, MoreVertical } from "lucide-react";
import { usePlayer, type Song } from "@/contexts/player-context";
import type { YouTubeVideo } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddToPlaylistDialog } from "./add-to-playlist-dialog";
import { optimizeImageUrl } from "@/lib/performance";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";

interface TrackCardProps {
  track: YouTubeVideo;
  showArtist?: boolean;
}

export function TrackCard({ track, showArtist = true }: TrackCardProps) {
  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayer();
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

  const isCurrentTrack = currentSong?.id === track.id;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;
  const optimizedThumbnail = optimizeImageUrl(track.thumbnail);

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
            src={optimizedThumbnail}
            alt={track.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/30 to-primary/10">
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

        {/* More options menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowAddToPlaylist(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add to Playlist
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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

      {/* Add to Playlist Dialog */}
      <AddToPlaylistDialog 
        open={showAddToPlaylist}
        onOpenChange={setShowAddToPlaylist}
        song={track as Song}
      />
    </div>
  );
}

