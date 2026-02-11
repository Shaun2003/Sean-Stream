'use client';

import { useEnhancedPlayer } from "@/contexts/enhanced-player-context";
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
  Moon,
  Mic2,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect, useRef, useCallback } from "react";
import { isTrackLiked, likeTrack, unlikeTrack } from "@/lib/offline-storage";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { shareTrack } from "@/lib/share-utils";
import { useToast } from "@/hooks/use-toast";
import { LyricsDisplay } from "@/components/music/lyrics-display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

const SLEEP_TIMER_OPTIONS = [
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "45 minutes", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "End of track", value: -1 },
];

export default function PlayerClient() {
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
  } = useEnhancedPlayer();

  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [dominantColor, setDominantColor] = useState<string>("oklch(0.18 0 0)");

  useEffect(() => {
    if (currentSong) {
      isTrackLiked(currentSong.id).then(setIsLiked);
    }
  }, [currentSong]);

  // Sleep timer logic
  useEffect(() => {
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
    }

    if (sleepTimer === null || sleepTimer === 0) {
      setSleepTimerRemaining(null);
      return;
    }

    if (sleepTimer === -1) {
      // End of current track -- handled in a different effect
      setSleepTimerRemaining(null);
      return;
    }

    const endTime = Date.now() + sleepTimer * 60 * 1000;
    setSleepTimerRemaining(sleepTimer * 60);

    sleepTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      setSleepTimerRemaining(remaining);
      if (remaining <= 0) {
        if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
        // Pause playback
        if (isPlaying) togglePlayPause();
        setSleepTimer(null);
        setSleepTimerRemaining(null);
        toast({ title: "Sleep Timer", description: "Playback paused. Goodnight!" });
      }
    }, 1000);

    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [sleepTimer]);

  // Handle "end of track" sleep timer
  useEffect(() => {
    if (sleepTimer === -1 && currentTime > 0 && duration > 0 && duration - currentTime < 2) {
      // Near end of track, pause
      setSleepTimer(null);
      setTimeout(() => {
        if (isPlaying) togglePlayPause();
        toast({ title: "Sleep Timer", description: "Playback paused after this track." });
      }, 2000);
    }
  }, [sleepTimer, currentTime, duration]);

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
      toast({ title: "Shared", description: result });
    }
  };

  const handleSetSleepTimer = (minutes: number) => {
    setSleepTimer(minutes);
    if (minutes === -1) {
      toast({ title: "Sleep Timer", description: "Playback will pause after this track" });
    } else {
      toast({ title: "Sleep Timer", description: `Playback will pause in ${minutes} minutes` });
    }
  };

  const handleCancelSleepTimer = () => {
    setSleepTimer(null);
    setSleepTimerRemaining(null);
    toast({ title: "Sleep Timer", description: "Timer cancelled" });
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

  const formatTimerRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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
    <div
      className="fixed inset-0 z-50 flex transition-colors duration-1000"
      style={{
        background: `linear-gradient(to bottom, ${dominantColor}, var(--background))`,
      }}
    >
      {/* Main Player Area */}
      <div className={cn("flex-1 flex flex-col", showQueue && "hidden md:flex")}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-8 py-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="w-10 h-10">
            <ChevronDown className="w-6 h-6" />
          </Button>
          <div className="text-center flex items-center gap-2">
            <p className="text-xs text-foreground/70 uppercase tracking-wider font-medium">
              Now Playing
            </p>
            {sleepTimerRemaining !== null && (
              <span className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-full">
                <Timer className="w-3 h-3 inline mr-1" />
                {formatTimerRemaining(sleepTimerRemaining)}
              </span>
            )}
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
          <div className="w-full max-w-md aspect-square rounded-xl overflow-hidden shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
            {currentSong.thumbnail ? (
              <img
                src={currentSong.thumbnail || "/placeholder.svg"}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/40 to-primary/10">
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
              <p className="text-base md:text-lg text-foreground/60 line-clamp-1 mt-1">
                {currentSong.artist}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="w-10 h-10 shrink-0 mt-1" onClick={handleLike}>
              <Heart className={cn("w-6 h-6 transition-all", isLiked && "fill-primary text-primary scale-110")} />
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
            <div className="flex items-center justify-between text-xs text-foreground/50">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-between px-2">
            <Button variant="ghost" size="icon" className="w-10 h-10" onClick={handleShuffle}>
              <Shuffle className={cn("w-5 h-5", isShuffled && "text-primary")} />
            </Button>
            <Button variant="ghost" size="icon" className="w-12 h-12" onClick={previousTrack}>
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
            <Button variant="ghost" size="icon" className="w-12 h-12" onClick={nextTrack}>
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
                <Repeat className={cn("w-5 h-5", repeatMode !== "off" && "text-primary")} />
                {repeatMode === "one" && (
                  <span className="absolute -top-1 -right-2 text-[10px] font-bold text-primary">1</span>
                )}
              </div>
            </Button>
          </div>

          {/* Extra Controls Row */}
          <div className="flex items-center justify-between">
            {/* Lyrics Button */}
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10"
              onClick={() => setShowLyrics(true)}
              title="Lyrics"
            >
              <Mic2 className="w-5 h-5" />
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-2 w-32">
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={toggleMute}>
                {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider
                value={[volume]}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0])}
                className="flex-1"
              />
            </div>

            {/* More menu with sleep timer */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Track
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowLyrics(true)}>
                  <Mic2 className="w-4 h-4 mr-2" />
                  View Lyrics
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Moon className="w-4 h-4 mr-2" />
                    Sleep Timer
                    {sleepTimer !== null && (
                      <span className="ml-auto text-xs text-primary">ON</span>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {SLEEP_TIMER_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => handleSetSleepTimer(option.value)}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                    {sleepTimer !== null && (
                      <DropdownMenuItem onClick={handleCancelSleepTimer} className="text-destructive">
                        Cancel Timer
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={() => toast({ title: "Download", description: "Starting download..." })}>
                  <Download className="w-4 h-4 mr-2" />
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
          "w-full md:w-80 bg-card/90 backdrop-blur-xl border-l border-border flex flex-col",
          showQueue ? "flex" : "hidden"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-foreground">Queue</h2>
          <Button variant="ghost" size="icon" className="w-8 h-8 md:hidden" onClick={() => setShowQueue(false)}>
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Now Playing</p>
              <div className="flex items-center gap-3 p-2 rounded-md bg-primary/10">
                <div className="w-10 h-10 rounded overflow-hidden bg-secondary shrink-0">
                  {currentSong.thumbnail && (
                    <img src={currentSong.thumbnail || "/placeholder.svg"} alt={currentSong.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{currentSong.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{currentSong.artist}</p>
                </div>
              </div>
            </div>
            {queue.length > queueIndex + 1 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Next in queue</p>
                <div className="space-y-1">
                  {queue.slice(queueIndex + 1).map((track, index) => (
                    <button
                      key={`${track.id}-${index}`}
                      onClick={() => playSong(track)}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 transition-colors"
                    >
                      <span className="w-4 text-xs text-muted-foreground">{index + 1}</span>
                      <div className="w-10 h-10 rounded overflow-hidden bg-secondary shrink-0">
                        {track.thumbnail && (
                          <img src={track.thumbnail || "/placeholder.svg"} alt={track.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Lyrics Dialog */}
      <LyricsDisplay
        trackId={currentSong.id}
        title={currentSong.title}
        artist={currentSong.artist || ""}
        isOpen={showLyrics}
        onClose={() => setShowLyrics(false)}
      />
    </div>
  );
}
