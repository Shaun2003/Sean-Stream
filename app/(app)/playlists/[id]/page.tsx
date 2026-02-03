'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Music, Trash2, Plus, Play, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { TrackRow } from '@/components/music/track-row';
import { AddToPlaylistDialog } from '@/components/music/add-to-playlist-dialog';
import { ImportSongsDialog } from '@/components/music/import-songs-dialog';
import { toast } from '@/hooks/use-toast';
import { usePlayer, type Song } from '@/contexts/player-context';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
}

interface PlaylistTrack {
  id: string;
  video_id: string;
  title: string;
  artist?: string;
  thumbnail?: string;
  duration?: number | string;
  position: number;
}

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { playQueue } = usePlayer();
  const playlistId = params.id as string;

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Song | null>(null);

  useEffect(() => {
    loadPlaylist();
  }, [playlistId]);

  const loadPlaylist = async () => {
    try {
      setLoading(true);
      // In a real app, you'd fetch the specific playlist
      // For now, we'll just load the tracks
      const response = await fetch(`/api/playlists/tracks?id=${playlistId}`);
      if (!response.ok) throw new Error('Failed to load playlist');
      const { data } = await response.json();
      setTracks(data || []);
    } catch (error) {
      console.error('Error loading playlist:', error);
      toast({ title: 'Error', description: 'Failed to load playlist', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTrack = async (videoId: string) => {
    try {
      setDeleting(videoId);
      const response = await fetch(
        `/api/playlists/tracks?playlist_id=${playlistId}&video_id=${videoId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to remove track');

      setTracks((prev) => prev.filter((t) => t.video_id !== videoId));
      toast({ title: 'Success', description: 'Track removed from playlist' });
    } catch (error) {
      console.error('Error removing track:', error);
      toast({ title: 'Error', description: 'Failed to remove track', variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 md:px-8 py-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">Playlist</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">{tracks.length} tracks</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {tracks.length > 0 && (
              <Button
                onClick={() => {
                  const playlistSongs = tracks.map((track) => {
                    let durationStr = '0:00';
                    if (typeof track.duration === 'number') {
                      durationStr = `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`;
                    } else if (typeof track.duration === 'string') {
                      durationStr = track.duration;
                    }
                    return {
                      id: track.video_id,
                      title: track.title,
                      artist: track.artist || 'Unknown Artist',
                      channelTitle: track.artist || 'Unknown Artist',
                      thumbnail: track.thumbnail || '',
                      duration: durationStr,
                    } as Song;
                  });
                  playQueue(playlistSongs, 0);
                  toast({ title: 'Playing', description: `Now playing playlist (${playlistSongs.length} tracks)` });
                }}
                size="sm"
                className="gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span className="hidden sm:inline">Play All</span>
              </Button>
            )}
            <Button
              onClick={() => setShowImportDialog(true)}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-8">
        {tracks.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No tracks in this playlist yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track, index) => {
              // Convert duration if needed
              let durationStr = '0:00';
              if (typeof track.duration === 'number') {
                durationStr = `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`;
              } else if (typeof track.duration === 'string') {
                durationStr = track.duration;
              }

              return (
                <TrackRow
                  key={track.id}
                  track={{
                    id: track.video_id,
                    title: track.title,
                    artist: track.artist || 'Unknown Artist',
                    channelTitle: track.artist || 'Unknown Artist',
                    thumbnail: track.thumbnail || '',
                    duration: durationStr,
                  }}
                  index={index + 1}
                  onAddToPlaylistSuccess={loadPlaylist}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Add to Playlist Dialog */}
      <AddToPlaylistDialog
        open={showAddToPlaylist}
        onOpenChange={setShowAddToPlaylist}
        song={selectedTrack || undefined}
      />

      {/* Import Songs Dialog */}
      <ImportSongsDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        playlistId={playlistId}
        onImportComplete={loadPlaylist}
      />
    </div>
  );
}
