"use client";

import React from "react"
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getLikedTracks, getRecentlyPlayed } from "@/lib/offline-storage";
import { getDownloadedTracks, type StoredDownload, downloadTrack } from "@/lib/offline-download";
import type { YouTubeVideo } from "@/lib/youtube";
import { usePlayer, type Song } from "@/contexts/player-context";
import { useToast } from "@/hooks/use-toast";
import { TrackRow } from "@/components/music/track-row";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Clock, Download, Play, Shuffle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Loading from "./loading";
import { supabase } from "@/lib/supabase/client";
import { syncBookmarkTrack, syncUnbookmarkTrack } from "@/lib/backend-sync";

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "liked";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [likedTracks, setLikedTracks] = useState<YouTubeVideo[]>([]);
  const [recentTracks, setRecentTracks] = useState<YouTubeVideo[]>([]);
  const [downloadedTracks, setDownloadedTracks] = useState<StoredDownload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const { playQueue, shuffleQueue } = usePlayer();
  const { toast } = useToast();

  useEffect(() => {
    async function loadLibrary() {
      setIsLoading(true);
      try {
        const [liked, recent, downloaded] = await Promise.all([
          getLikedTracks(),
          getRecentlyPlayed(),
          getDownloadedTracks(),
        ]);
        setLikedTracks(liked);
        setRecentTracks(recent);
        setDownloadedTracks(downloaded);

        // Initialize downloaded IDs set
        const downloadedIdSet = new Set(downloaded.map((d) => d.id));
        setDownloadedIds(downloadedIdSet);
      } catch (error) {
        console.error("[v0] Error loading library:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadLibrary();
  }, []);

  const handlePlayAll = (tracks: YouTubeVideo[]) => {
    if (tracks.length > 0) {
      playQueue(tracks as Song[]);
    }
  };

  const handleShufflePlay = (tracks: YouTubeVideo[]) => {
    if (tracks.length > 0) {
      playQueue(tracks as Song[]);
      shuffleQueue();
    }
  };

  const handleDownloadTrack = async (track: YouTubeVideo) => {
    const isAlreadyDownloaded = downloadedIds.has(track.id);

    if (isAlreadyDownloaded) {
      toast({
        title: "Already Downloaded",
        description: "This track is already in your library.",
      });
      return;
    }

    setDownloadingIds((prev) => new Set(prev).add(track.id));

    try {
      await downloadTrack(track, (progress) => {
        console.log(`[v0] Download progress for ${track.id}: ${progress}%`);
      });

      setDownloadedIds((prev) => new Set(prev).add(track.id));
      
      // Reload downloaded tracks
      const updated = await getDownloadedTracks();
      setDownloadedTracks(updated);

      // Sync bookmark to backend if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await syncBookmarkTrack(track as Song, { offline: true });
      }

      toast({
        title: "Success",
        description: `"${track.title}" downloaded successfully!`,
      });
    } catch (error) {
      console.error("[v0] Download error:", error);
      toast({
        title: "Download Failed",
        description: `Failed to download "${track.title}". Try again later.`,
        variant: "destructive",
      });
    } finally {
      setDownloadingIds((prev) => {
        const updated = new Set(prev);
        updated.delete(track.id);
        return updated;
      });
    }
  };

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Your Library</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-secondary/50 p-1">
            <TabsTrigger
              value="liked"
              className="data-[state=active]:bg-card gap-2"
            >
              <Heart className="w-4 h-4" />
              Liked Songs
            </TabsTrigger>
            <TabsTrigger
              value="recent"
              className="data-[state=active]:bg-card gap-2"
            >
              <Clock className="w-4 h-4" />
              Recently Played
            </TabsTrigger>
            <TabsTrigger
              value="downloads"
              className="data-[state=active]:bg-card gap-2"
            >
              <Download className="w-4 h-4" />
              Downloads
            </TabsTrigger>
          </TabsList>

          {/* Liked Songs Tab */}
          <TabsContent value="liked" className="mt-6">
            {likedTracks.length > 0 ? (
              <div className="space-y-4">
                {/* Header with gradient */}
                <div className="flex items-end gap-6 p-6 rounded-lg bg-linear-to-br from-purple-700/50 to-blue-600/30">
                  <div className="w-32 h-32 md:w-48 md:h-48 rounded-lg bg-linear-to-br from-purple-600 to-blue-400 flex items-center justify-center shadow-xl">
                    <Heart className="w-16 h-16 md:w-20 md:h-20 text-foreground fill-current" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground/80 uppercase tracking-wider">
                      Playlist
                    </p>
                    <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-1">
                      Liked Songs
                    </h2>
                    <p className="text-sm text-foreground/70 mt-2">
                      {likedTracks.length} songs
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 px-2">
                  <Button
                    size="lg"
                    className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 hover:scale-105 transition-transform"
                    onClick={() => handlePlayAll(likedTracks)}
                  >
                    <Play className="w-6 h-6 fill-current ml-1" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10"
                    onClick={() => handleShufflePlay(likedTracks)}
                  >
                    <Shuffle className="w-6 h-6" />
                  </Button>
                </div>

                {/* Track List */}
                <div className="space-y-1">
                  {likedTracks.map((track, index) => (
                    <TrackRow 
                      key={track.id} 
                      track={track} 
                      index={index + 1}
                      onDownloadClick={() => handleDownloadTrack(track)}
                      isDownloaded={downloadedIds.has(track.id)}
                      isDownloading={downloadingIds.has(track.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Heart}
                title="Songs you like will appear here"
                description="Save songs by tapping the heart icon"
              />
            )}
          </TabsContent>

          {/* Recently Played Tab */}
          <TabsContent value="recent" className="mt-6">
            {recentTracks.length > 0 ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-end gap-6 p-6 rounded-lg bg-linear-to-br from-green-700/50 to-emerald-600/30">
                  <div className="w-32 h-32 md:w-48 md:h-48 rounded-lg bg-linear-to-br from-green-600 to-emerald-400 flex items-center justify-center shadow-xl">
                    <Clock className="w-16 h-16 md:w-20 md:h-20 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground/80 uppercase tracking-wider">
                      Playlist
                    </p>
                    <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-1">
                      Recently Played
                    </h2>
                    <p className="text-sm text-foreground/70 mt-2">
                      {recentTracks.length} songs
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 px-2">
                  <Button
                    size="lg"
                    className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 hover:scale-105 transition-transform"
                    onClick={() => handlePlayAll(recentTracks)}
                  >
                    <Play className="w-6 h-6 fill-current ml-1" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10"
                    onClick={() => handleShufflePlay(recentTracks)}
                  >
                    <Shuffle className="w-6 h-6" />
                  </Button>
                </div>

                {/* Track List */}
                <div className="space-y-1">
                  {recentTracks.map((track, index) => (
                    <TrackRow 
                      key={track.id} 
                      track={track} 
                      index={index + 1}
                      onDownloadClick={() => handleDownloadTrack(track)}
                      isDownloaded={downloadedIds.has(track.id)}
                      isDownloading={downloadingIds.has(track.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="Listen to music"
                description="Your recently played tracks will show up here"
              />
            )}
          </TabsContent>

          {/* Downloads Tab */}
          <TabsContent value="downloads" className="mt-6">
            {downloadedTracks.length > 0 ? (
              <div className="space-y-4">
                {/* Header with gradient */}
                <div className="flex items-end gap-6 p-6 rounded-lg bg-linear-to-br from-green-700/50 to-emerald-600/30">
                  <div className="w-32 h-32 md:w-48 md:h-48 rounded-lg bg-linear-to-br from-green-600 to-emerald-400 flex items-center justify-center shadow-xl">
                    <Download className="w-16 h-16 md:w-20 md:h-20 text-foreground fill-current" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">
                      Offline Downloads
                    </p>
                    <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                      My Downloads
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {downloadedTracks.length} songs downloaded
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 md:gap-4">
                  <Button
                    className="gap-2"
                    size="lg"
                    onClick={() => handlePlayAll(downloadedTracks)}
                  >
                    <Play className="w-5 h-5" />
                    Play All
                  </Button>
                  <Button
                    variant="outline"
                    className="w-10 h-10"
                    size="icon"
                    onClick={() => handleShufflePlay(downloadedTracks)}
                  >
                    <Shuffle className="w-6 h-6" />
                  </Button>
                </div>

                {/* Track List */}
                <div className="space-y-1">
                  {downloadedTracks.map((track, index) => (
                    <TrackRow 
                      key={track.id} 
                      track={track as YouTubeVideo} 
                      index={index + 1}
                      isDownloaded={true}
                      onDownloadClick={() => handleDownloadTrack(track as YouTubeVideo)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Download}
                title="No downloads yet"
                description="Download songs from search to listen offline"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Suspense>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

