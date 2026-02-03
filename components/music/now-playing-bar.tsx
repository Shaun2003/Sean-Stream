"use client";

import { usePlayer, type Song } from "@/contexts/player-context";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Repeat,
  Shuffle,
  ListMusic,
  Maximize2,
  Loader2,
  Share2,
  MoreVertical,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useState, useEffect, memo } from "react";
import Link from "next/link";
import { isTrackLiked, likeTrack, unlikeTrack } from "@/lib/offline-storage";
import { shareTrack } from "@/lib/share-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { AddToPlaylistDialog } from "@/components/music/add-to-playlist-dialog";

interface NowPlayingBarProps {
  className?: string;
  mobile?: boolean;
}

function NowPlayingBarComponent({ className, mobile }: NowPlayingBarProps) {
  const {
    currentSong,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    togglePlayPause,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    shuffleQueue,
  } = usePlayer();

  const { toast } = useToast();

  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [prevVolume, setPrevVolume] = useState(volume);
  const [showQueue, setShowQueue] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

  useEffect(() => {
    if (currentSong) {
      isTrackLiked(currentSong.id).then(setIsLiked);
    }
  }, [currentSong]);

  const handleLike = async () => {
    if (!currentSong) return;
    if (isLiked) {
      await unlikeTrack(currentSong.id);
      setIsLiked(false);
    } else {
      await likeTrack(currentSong);
      setIsLiked(true);
    }
  };

  const handleShuffle = () => {
    setIsShuffled(!isShuffled);
    if (!isShuffled) {
      shuffleQueue();
    }
  };

  const handleShare = async () => {
    if (!currentSong) {
      toast({
        title: "No song",
        description: "Please play a song first",
      });
      return;
    }
    const result = await shareTrack(currentSong as Song);
    if (result) {
      toast({
        title: "Shared",
        description: result,
      });
    }
  };

  const handleDownload = () => {
    // Placeholder - will be implemented with offline storage
    toast({
      title: "Download",
      description: "Starting download...",
    });
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 80);
    }
  };

  if (!currentSong) {
    return null;
  }

  // Mobile mini player
  if (mobile) {
    return (
      <div className="fixed bottom-16 left-0 right-0 z-30 px-3 safe-area-bottom">
        <div className="bg-card/95 backdrop-blur-xl rounded-xl shadow-lg border border-border overflow-hidden">
          {/* Interactive Progress Slider */}
          <div className="px-3 pt-2">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={(value) => seek(value[0])}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3">
            {/* Album art */}
            <Link href="/player" className="block">
              <div className="w-11 h-11 rounded-lg overflow-hidden bg-secondary shrink-0">
                {currentSong.thumbnail ? (
                  <img
                    src={currentSong.thumbnail || "/placeholder.svg"}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/30 to-primary/10">
                    <span className="text-lg font-bold text-primary">
                      {currentSong.title[0]}
                    </span>
                  </div>
                )}
              </div>
            </Link>

            {/* Song info */}
            <Link href="/player" className="flex-1 min-w-0 block">
              <h3 className="font-medium text-sm text-foreground truncate">
                {currentSong.title}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {currentSong.artist}
              </p>
            </Link>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLike();
                }}
              >
                <Heart
                  className={cn(
                    "w-5 h-5",
                    isLiked && "fill-primary text-primary"
                  )}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  togglePlayPause();
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop now playing bar
  return (
    <div
      className={cn(
        "h-20 bg-card border-t border-border px-4 flex items-center justify-between gap-4",
        className
      )}
    >
      {/* Left: Song info */}
      <div className="flex items-center gap-3 w-[30%] min-w-[180px]">
        <div className="w-14 h-14 rounded-md overflow-hidden bg-secondary shrink-0">
          {currentSong.thumbnail ? (
            <img
              src={currentSong.thumbnail || "/placeholder.svg"}
              alt={currentSong.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/30 to-primary/10">
              <span className="text-xl font-bold text-primary">
                {currentSong.title[0]}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate hover:underline cursor-pointer">
            {currentSong.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate hover:underline cursor-pointer">
            {currentSong.artist}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 ml-2"
          onClick={handleLike}
        >
          <Heart
            className={cn(
              "w-4 h-4",
              isLiked && "fill-primary text-primary"
            )}
          />
        </Button>
      </div>

      {/* Center: Controls */}
      <div className="flex flex-col items-center gap-1 w-[40%] max-w-[600px]">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={handleShuffle}
          >
            <Shuffle
              className={cn("w-4 h-4", isShuffled && "text-primary")}
            />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={previousTrack}
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </Button>

          <Button
            size="icon"
            className="w-9 h-9 rounded-full bg-foreground text-background hover:bg-foreground/90 hover:scale-105 transition-transform"
            onClick={togglePlayPause}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={nextTrack}
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => {
              const modes: ("off" | "all" | "one")[] = ["off", "all", "one"];
              const currentIndex = modes.indexOf(repeatMode);
              setRepeatMode(modes[(currentIndex + 1) % modes.length]);
            }}
          >
            <div className="relative">
              <Repeat
                className={cn("w-4 h-4", repeatMode !== "off" && "text-primary")}
              />
              {repeatMode === "one" && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold text-primary">
                  1
                </span>
              )}
            </div>
          </Button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-muted-foreground w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={(value) => seek(value[0])}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Volume and extras */}
      <div className="flex items-center justify-end gap-2 w-[30%] min-w-[180px]">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={handleShare}
          title="Share"
        >
          <Share2 className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => setShowQueue(!showQueue)}
        >
          <ListMusic
            className={cn("w-4 h-4", showQueue && "text-primary")}
          />
        </Button>

        <div className="flex items-center gap-2 w-32">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={toggleMute}
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <Slider
            value={[volume]}
            max={100}
            step={1}
            onValueChange={(value) => setVolume(value[0])}
            className="flex-1"
          />
        </div>

        <Link href="/player">
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </Link>

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowAddToPlaylist(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add to Playlist
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare}>
              Share Track
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload}>
              Save for Offline
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AddToPlaylistDialog open={showAddToPlaylist} onOpenChange={setShowAddToPlaylist} />
    </div>
  );
}

export const NowPlayingBar = memo(NowPlayingBarComponent);

