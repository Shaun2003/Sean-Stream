"use client";

import { useEffect, useState } from "react";
import { getTrackLyrics, type TrackLyrics } from "@/lib/lyrics";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Music } from "lucide-react";

interface LyricsDisplayProps {
  trackId: string;
  title: string;
  artist: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LyricsDisplay({
  trackId,
  title,
  artist,
  isOpen,
  onClose,
}: LyricsDisplayProps) {
  const [lyrics, setLyrics] = useState<TrackLyrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadLyrics() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getTrackLyrics(trackId, title, artist);
        if (data) {
          setLyrics(data);
        } else {
          setError("Lyrics not found");
        }
      } catch (err) {
        console.error("[Lyrics] Error loading lyrics:", err);
        setError("Failed to load lyrics");
      } finally {
        setIsLoading(false);
      }
    }

    loadLyrics();
  }, [isOpen, trackId, title, artist]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              <div>
                <p className="text-lg">{title}</p>
                <p className="text-sm text-muted-foreground">{artist}</p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{error}</p>
          </div>
        ) : lyrics ? (
          <ScrollArea className="h-125 pr-4">
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {lyrics.lyrics}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
