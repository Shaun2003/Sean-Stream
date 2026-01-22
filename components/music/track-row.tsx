"use client";

import { Play, Pause, MoreHorizontal, Heart, Plus, ListPlus } from "lucide-react";
import { usePlayer, type Song } from "@/contexts/player-context";
import type { YouTubeVideo } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { isTrackLiked, likeTrack, unlikeTrack } from "@/lib/offline-storage";
import { cn } from "@/lib/utils";

interface TrackRowProps {
  track: YouTubeVideo;
  index?: number;
  showAlbum?: boolean;
}

export function TrackRow({ track, index, showAlbum = false }: TrackRowProps) {
  const { playSong, addToQueue, currentSong, isPlaying, togglePlayPause } =
    usePlayer();
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isCurrentTrack = currentSong?.id === track.id;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;

  useEffect(() => {
    isTrackLiked(track.id).then(setIsLiked);
  }, [track.id]);

  const handlePlay = () => {
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      playSong(track as Song);
    }
  };

  const handleLike = async () => {
    if (isLiked) {
      await unlikeTrack(track.id);
      setIsLiked(false);
    } else {
      await likeTrack(track);
      setIsLiked(true);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-4 px-4 py-2 rounded-md hover:bg-card/60 transition-colors",
        isCurrentTrack && "bg-card/40"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Index / Play button */}
      <div className="w-6 flex items-center justify-center">
        {isHovered || isCurrentlyPlaying ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 p-0"
            onClick={handlePlay}
          >
            {isCurrentlyPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
          </Button>
        ) : (
          <span
            className={cn(
              "text-sm tabular-nums",
              isCurrentTrack ? "text-primary" : "text-muted-foreground"
            )}
          >
            {index}
          </span>
        )}
      </div>

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded overflow-hidden bg-secondary flex-shrink-0">
        {track.thumbnail ? (
          <img
            src={track.thumbnail || "/placeholder.svg"}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
            <span className="text-sm font-bold text-primary">
              {track.title[0]}
            </span>
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <h3
          className={cn(
            "font-medium text-sm truncate",
            isCurrentTrack ? "text-primary" : "text-foreground"
          )}
        >
          {track.title}
        </h3>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
      </div>

      {/* Like button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity",
          isLiked && "opacity-100"
        )}
        onClick={handleLike}
      >
        <Heart
          className={cn("w-4 h-4", isLiked && "fill-primary text-primary")}
        />
      </Button>

      {/* Duration */}
      <span className="text-sm text-muted-foreground w-12 text-right">
        {track.duration}
      </span>

      {/* More options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => addToQueue(track as Song)}>
            <ListPlus className="w-4 h-4 mr-2" />
            Add to queue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLike}>
            <Heart className="w-4 h-4 mr-2" />
            {isLiked ? "Remove from Liked" : "Add to Liked Songs"}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Plus className="w-4 h-4 mr-2" />
            Add to playlist
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
