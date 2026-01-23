"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Play, Pause, Download, Share2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlaylistItems, type YouTubeVideo } from "@/lib/youtube";
import { usePlayer, type Song } from "@/contexts/player-context";
import { TrackRow } from "@/components/music/track-row";
import { downloadTrack, isTrackDownloaded } from "@/lib/offline-download";
import { useToast } from "@/hooks/use-toast";
import { shareTrack } from "@/lib/share-utils";

interface PlaylistData {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  itemCount?: number;
}

export default function AlbumPage() {
  const router = useRouter();
  const params = useParams();
  const playlistId = params.id as string;
  const { toast } = useToast();
  const { playQueue, currentSong, isPlaying, togglePlayPause } = usePlayer();

  const [albumData, setAlbumData] = useState<PlaylistData | null>(null);
  const [tracks, setTracks] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(
    new Set()
  );
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadAlbum() {
      setIsLoading(true);
      try {
        // In a real scenario, you'd fetch playlist metadata from YouTube
        // For now, we'll load the tracks directly
        const albumTracks = await getPlaylistItems(playlistId);
        setTracks(albumTracks);

        // Set basic album data from first track or playlist info
        if (albumTracks.length > 0) {
          setAlbumData({
            id: playlistId,
            title: `Album - ${albumTracks[0].artist || "Unknown"}`,
            description: `${albumTracks.length} songs`,
            thumbnail: albumTracks[0].thumbnail,
            channelTitle: albumTracks[0].channelTitle,
            itemCount: albumTracks.length,
          });
        }

        // Check which tracks are already downloaded
        const downloaded = new Set<string>();
        for (const track of albumTracks) {
          const isDownloaded = await isTrackDownloaded(track.id);
          if (isDownloaded) {
            downloaded.add(track.id);
          }
        }
        setDownloadedIds(downloaded);
      } catch (error) {
        console.error("[v0] Error loading album:", error);
        toast({
          title: "Error",
          description: "Failed to load album. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    if (playlistId) {
      loadAlbum();
    }
  }, [playlistId, toast]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playQueue(tracks as Song[]);
    }
  };

  const handlePlayAlbum = () => {
    if (isPlaying && currentSong?.id === tracks[0]?.id) {
      togglePlayPause();
    } else {
      handlePlayAll();
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

  const handleDownloadAlbum = async () => {
    const toDownload = tracks.filter((t) => !downloadedIds.has(t.id));

    if (toDownload.length === 0) {
      toast({
        title: "Already Downloaded",
        description: "All tracks in this album are already downloaded.",
      });
      return;
    }

    setDownloadingIds(new Set(toDownload.map((t) => t.id)));

    let successful = 0;
    let failed = 0;

    for (const track of toDownload) {
      try {
        await downloadTrack(track);
        successful++;
        setDownloadedIds((prev) => new Set(prev).add(track.id));
      } catch (error) {
        failed++;
        console.error(`[v0] Failed to download ${track.id}:`, error);
      }
    }

    setDownloadingIds(new Set());

    if (failed === 0) {
      toast({
        title: "Success",
        description: `Downloaded ${successful} track(s)!`,
      });
    } else {
      toast({
        title: "Partial Download",
        description: `Downloaded ${successful}, failed ${failed}. Try again later.`,
        variant: "destructive",
      });
    }
  };

  const handleShareAlbum = async () => {
    if (!albumData) return;
    try {
      await navigator.share({
        title: albumData.title,
        text: `Check out this album: ${albumData.title}`,
        url: window.location.href,
      });
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Album link copied to clipboard!",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-12" />
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>

        {/* Tracks skeleton */}
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!albumData) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Album Not Found</h1>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Album Header */}
      <div className="space-y-6">
        {/* Album Banner */}
        <div className="relative h-64 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-blue-600">
          {albumData.thumbnail && (
            <img
              src={albumData.thumbnail}
              alt={albumData.title}
              className="w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
            <h1 className="text-4xl font-bold text-white mb-2">
              {albumData.title}
            </h1>
            <p className="text-sm text-gray-200">{albumData.channelTitle}</p>
            <p className="text-xs text-gray-300 mt-1">{albumData.description}</p>
          </div>
        </div>

        {/* Album Controls */}
        <div className="flex flex-wrap gap-3 md:gap-4">
          <Button
            onClick={handlePlayAlbum}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isPlaying && currentSong?.id === tracks[0]?.id ? (
              <>
                <Pause className="w-5 h-5 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Play All
              </>
            )}
          </Button>

          <Button
            onClick={handleDownloadAlbum}
            variant="outline"
            size="lg"
            disabled={downloadingIds.size > 0}
          >
            <Download className="w-5 h-5 mr-2" />
            {downloadedIds.size === tracks.length
              ? "Downloaded"
              : "Download All"}
          </Button>

          <Button
            onClick={handleShareAlbum}
            variant="outline"
            size="lg"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Tracks List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Tracks ({tracks.length})
        </h2>

        <div className="space-y-1">
          {tracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index + 1}
              isDownloaded={downloadedIds.has(track.id)}
              isDownloading={downloadingIds.has(track.id)}
              onDownloadClick={() => handleDownloadTrack(track)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
