"use client";

import { usePlayer } from "@/contexts/player-context";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  Heart,
  Repeat,
  Shuffle,
  Volume2,
  VolumeX,
  ListMusic,
  Loader2,
  Share2,
  MoreHorizontal,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";
import { isTrackLiked, likeTrack, unlikeTrack } from "@/lib/offline-storage";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { shareTrack } from "@/lib/share-utils";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PlayerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    currentSong,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    queue,
    queueIndex,
    togglePlayPause,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    shuffleQueue,
    playSong,
  } = usePlayer();

  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [showQueue, setShowQueue] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);

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
    const result = await shareTrack(currentSong);
    if (result) {
      toast({
        title: "Shared",
        description: result,
      });
    }
  };

  const handleDownload = () => {
    toast({
      title: "Download",
      description: "Starting download...",
    });
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 80);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!currentSong) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No song selected</p>
          <p className="text-sm text-muted-foreground">
            Search for music or play from the home page
          </p>
          <Button onClick={() => router.push("/search")}>Find Music</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-linear-to-b from-secondary/50 to-background flex">
      {/* Main Player Area */}
      <div className={cn("flex-1 flex flex-col", showQueue && "hidden md:flex")}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-8 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="w-10 h-10"
          >
            <ChevronDown className="w-6 h-6" />
          </Button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Now Playing
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10"
            onClick={() => setShowQueue(!showQueue)}
          >
            <ListMusic className={cn("w-5 h-5", showQueue && "text-primary")} />
          </Button>
        </div>

        {/* Album Art */}
        <div className="flex-1 flex items-center justify-center px-8 md:px-16 py-4">
          <div className="w-full max-w-md aspect-square rounded-xl overflow-hidden shadow-2xl">
            {currentSong.thumbnail ? (
              <img
                src={currentSong.thumbnail || "/placeholder.svg"}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/40 to-primary/10">
                <span className="text-8xl font-bold text-primary">
                  {currentSong.title[0]}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Song Info & Controls */}
        <div className="px-6 md:px-16 pb-8 md:pb-12 space-y-6 max-w-2xl mx-auto w-full flex flex-col">
          {/* Song Info */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-foreground line-clamp-2">
                {currentSong.title}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground line-clamp-1 mt-1">
                {currentSong.artist}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 shrink-0 mt-1"
              onClick={handleLike}
            >
              <Heart
                className={cn(
                  "w-6 h-6",
                  isLiked && "fill-primary text-primary"
                )}
              />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={(value) => seek(value[0])}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-between px-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10"
              onClick={handleShuffle}
            >
              <Shuffle
                className={cn("w-5 h-5", isShuffled && "text-primary")}
              />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12"
              onClick={previousTrack}
            >
              <SkipBack className="w-6 h-6 fill-current" />
            </Button>

            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-foreground text-background hover:bg-foreground/90 hover:scale-105 transition-transform"
              onClick={togglePlayPause}
            >
              {isLoading ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12"
              onClick={nextTrack}
            >
              <SkipForward className="w-6 h-6 fill-current" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10"
              onClick={() => {
                const modes: ("off" | "all" | "one")[] = ["off", "all", "one"];
                const currentIndex = modes.indexOf(repeatMode);
                setRepeatMode(modes[(currentIndex + 1) % modes.length]);
              }}
            >
              <div className="relative">
                <Repeat
                  className={cn(
                    "w-5 h-5",
                    repeatMode !== "off" && "text-primary"
                  )}
                />
                {repeatMode === "one" && (
                  <span className="absolute -top-1 -right-2 text-[10px] font-bold text-primary">
                    1
                  </span>
                )}
              </div>
            </Button>
          </div>

          {/* Volume & Extra Controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10"
              onClick={handleShare}
              title="Share"
            >
              <Share2 className="w-5 h-5" />
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare}>
                  Share Track
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  Save for Offline
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Queue Panel */}
      <div
        className={cn(
          "w-full md:w-80 bg-card border-l border-border flex flex-col",
          showQueue ? "flex" : "hidden"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-foreground">Queue</h2>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 md:hidden"
            onClick={() => setShowQueue(false)}
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* Now Playing */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground px-2 mb-2">
                Now Playing
              </p>
              <div className="flex items-center gap-3 p-2 rounded-md bg-primary/10">
                <div className="w-10 h-10 rounded overflow-hidden bg-secondary shrink-0">
                  {currentSong.thumbnail && (
                    <img
                      src={currentSong.thumbnail || "/placeholder.svg"}
                      alt={currentSong.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">
                    {currentSong.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {currentSong.artist}
                  </p>
                </div>
              </div>
            </div>

            {/* Up Next */}
            {queue.length > queueIndex + 1 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground px-2 mb-2">
                  Next in queue
                </p>
                <div className="space-y-1">
                  {queue.slice(queueIndex + 1).map((track, index) => (
                    <button
                      key={`${track.id}-${index}`}
                      onClick={() => playSong(track)}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 transition-colors"
                    >
                      <span className="w-4 text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="w-10 h-10 rounded overflow-hidden bg-secondary shrink-0">
                        {track.thumbnail && (
                          <img
                            src={track.thumbnail || "/placeholder.svg"}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-foreground truncate">
                          {track.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {track.artist}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

