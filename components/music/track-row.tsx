"use client";

import { Play, Pause, MoreHorizontal, Heart, ListPlus, Download, Trash2, CheckCircle, Plus } from "lucide-react";
import { usePlayer, type Song } from "@/contexts/player-context";
import type { YouTubeVideo } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, memo, useCallback } from "react";
import { isTrackLiked, likeTrack, unlikeTrack } from "@/lib/offline-storage";
import { isTrackDownloaded, removeDownloadedTrack } from "@/lib/offline-download";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { syncLikeTrack, syncUnlikeTrack } from "@/lib/backend-sync";
import { AddToPlaylistDialog } from "./add-to-playlist-dialog";

interface TrackRowProps {
  track: YouTubeVideo;
  index?: number;
  showAlbum?: boolean;
  onDownloadClick?: () => void;
  downloadProgress?: number;
  isDownloading?: boolean;
  isDownloaded?: boolean;
  onAddToPlaylistSuccess?: () => void; // Callback when song is successfully added to playlist
}

function TrackRowComponent({ 
  track, 
  index, 
  showAlbum = false,
  onDownloadClick,
  downloadProgress = 0,
  isDownloading = false,
  isDownloaded: propIsDownloaded,
  onAddToPlaylistSuccess
}: TrackRowProps) {
  const { playSong, addToQueue, currentSong, isPlaying, togglePlayPause } =
    usePlayer();
  const [isLiked, setIsLiked] = useState(false);
  const [isDownloadedState, setIsDownloadedState] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [propValueOverride, setPropValueOverride] = useState<boolean | undefined>(propIsDownloaded);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

  // Use prop if provided AND not overridden by action, otherwise use state
  const isDownloaded = propValueOverride !== undefined ? propValueOverride : isDownloadedState;

  const isCurrentTrack = currentSong?.id === track.id;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;

  useEffect(() => {
    isTrackLiked(track.id).then(setIsLiked);
  }, [track.id]);

  useEffect(() => {
    // Update prop override when prop changes
    setPropValueOverride(propIsDownloaded);
    // Only load from DB if prop is undefined
    if (propIsDownloaded === undefined) {
      isTrackDownloaded(track.id).then(setIsDownloadedState);
    } else {
      setIsDownloadedState(propIsDownloaded);
    }
  }, [track.id, propIsDownloaded]);

  const handlePlay = useCallback(() => {
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      playSong(track as Song);
    }
  }, [isCurrentTrack, track, togglePlayPause, playSong]);

  const handleLike = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (isLiked) {
        await unlikeTrack(track.id);
        setIsLiked(false);
        
        if (user) {
          await syncUnlikeTrack(track.id, { offline: true });
        }
      } else {
        await likeTrack(track);
        setIsLiked(true);
        
        if (user) {
          await syncLikeTrack(track as Song, { offline: true });
        }
      }
    } catch (error) {
      console.error("[v0] Error updating like:", error);
      setIsLiked(!isLiked);
    }
  }, [isLiked, track]);

  const handleRemoveDownload = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await removeDownloadedTrack(track.id);
      // Update internal state
      setIsDownloadedState(false);
      // Reset prop override to allow re-fetch from DB
      setPropValueOverride(undefined);
    } catch (error) {
      console.error("[v0] Failed to delete download:", error);
    }
  }, [track.id]);

  return (
    <div
      className={cn(
        "group flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 rounded-md hover:bg-card/60 transition-colors w-full",
        isCurrentTrack && "bg-card/40"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Index / Play button */}
      <div className="w-6 sm:w-8 flex items-center justify-center shrink-0">
        {/* On mobile: always show play button */}
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 p-0 flex sm:hidden"
          onClick={handlePlay}
        >
          {isCurrentlyPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
        </Button>
        {/* On desktop: show play button on hover, otherwise show index */}
        <div className="hidden sm:flex items-center justify-center w-full h-full">
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
                "text-xs sm:text-sm tabular-nums",
                isCurrentTrack ? "text-primary" : "text-muted-foreground"
              )}
            >
              {index}
            </span>
          )}
        </div>
      </div>

      {/* Thumbnail - visible on all devices */}
      <div className="w-8 sm:w-10 h-8 sm:h-10 rounded overflow-hidden bg-secondary shrink-0">
        {track.thumbnail ? (
          <img
            src={track.thumbnail || "/placeholder.svg"}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/30 to-primary/10">
            <span className="text-xs sm:text-sm font-bold text-primary">
              {track.title[0]}
            </span>
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <h3
          className={cn(
            "font-medium text-xs sm:text-sm truncate",
            isCurrentTrack ? "text-primary" : "text-foreground"
          )}
        >
          {track.title}
        </h3>
        <p className="text-xs text-muted-foreground truncate hidden sm:block">{track.artist}</p>
      </div>

      {/* Download Progress / Status */}
      {isDownloading && (
        <div className="flex items-center gap-1 sm:gap-2 w-20 sm:w-24 shrink-0">
          <div className="flex-1 bg-secondary rounded-full h-1 overflow-hidden">
            <div
              className="bg-green-500 h-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">{downloadProgress}%</span>
        </div>
      )}

      {/* Download button or status - always visible on mobile */}
      {!isDownloading && (
        <>
          {isDownloaded ? (
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              <Button
                variant="ghost"
                size="icon"
                className="w-6 sm:w-8 h-6 sm:h-8 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity active:scale-95"
                onClick={handleRemoveDownload}
                title="Delete download"
                type="button"
              >
                <Trash2 className="w-3 sm:w-4 h-3 sm:h-4 text-red-500" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="w-6 sm:w-8 h-6 sm:h-8 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity active:scale-95"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDownloadClick?.();
              }}
              title="Download"
              disabled={isDownloading}
              type="button"
            >
              <Download className="w-3 sm:w-4 h-3 sm:h-4" />
            </Button>
          )}
        </>
      )}

      {/* Duration - hidden on small devices */}
      <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right hidden sm:block">
        {track.duration}
      </span>

      {/* More options - always accessible */}
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 sm:w-8 h-6 sm:h-8 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-3 sm:w-4 h-3 sm:h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => addToQueue(track as Song)}>
              <ListPlus className="w-4 h-4 mr-2" />
              Add to queue
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowAddToPlaylist(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add to Playlist
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLike}>
              <Heart className="w-4 h-4 mr-2" />
              {isLiked ? "Remove from Liked" : "Add to Liked Songs"}
            </DropdownMenuItem>
            {isDownloaded ? (
              <DropdownMenuItem onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRemoveDownload(e as any);
              }}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete download
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDownloadClick?.();
              }} disabled={isDownloading}>
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? "Downloading..." : "Save for offline"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Add to Playlist Dialog */}
      <AddToPlaylistDialog 
        open={showAddToPlaylist}
        onOpenChange={setShowAddToPlaylist}
        song={track as Song}
        onAddSuccess={onAddToPlaylistSuccess}
      />
    </div>
  );
}

export const TrackRow = memo(TrackRowComponent);

