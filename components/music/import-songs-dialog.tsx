'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Music, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImportSongsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistId: string;
  onImportComplete?: () => void;
}

export function ImportSongsDialog({
  open,
  onOpenChange,
  playlistId,
  onImportComplete,
}: ImportSongsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [appleMusicUrl, setAppleMusicUrl] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  const handleSpotifyImport = async () => {
    if (!spotifyUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a Spotify playlist URL',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/import/spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistId,
          spotifyUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to import from Spotify');
      }

      setImportedCount(data.count || 0);
      toast({
        title: 'Success',
        description: data.message || `Imported ${data.count || 0} songs from Spotify`,
      });

      setSpotifyUrl('');
      onImportComplete?.();
      setTimeout(() => onOpenChange(false), 1000);
    } catch (error) {
      console.error('Error importing from Spotify:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import from Spotify',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleYouTubeImport = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a YouTube playlist URL (format: https://www.youtube.com/playlist?list=XXXXX)',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/import/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistId,
          youtubeUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to import from YouTube');
      }

      setImportedCount(data.count || 0);
      toast({
        title: 'Success',
        description: data.message || `Imported ${data.count || 0} songs from YouTube`,
      });

      setYoutubeUrl('');
      onImportComplete?.();
      setTimeout(() => onOpenChange(false), 1500);
    } catch (error) {
      console.error('Error importing from YouTube:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import from YouTube',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAppleMusicImport = async () => {
    if (!appleMusicUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an Apple Music playlist URL',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/import/apple-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistId,
          appleMusicUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to import from Apple Music');
      }

      setImportedCount(data.count || 0);
      toast({
        title: 'Success',
        description: data.message || `Imported ${data.count || 0} songs from Apple Music`,
      });

      setAppleMusicUrl('');
      onImportComplete?.();
      setTimeout(() => onOpenChange(false), 1000);
    } catch (error) {
      console.error('Error importing from Apple Music:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import from Apple Music',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Import Songs
          </DialogTitle>
          <DialogDescription>
            Import songs from Spotify, YouTube, Apple Music, and other platforms
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="youtube">YouTube</TabsTrigger>
            <TabsTrigger value="spotify">Spotify</TabsTrigger>
            <TabsTrigger value="apple">Apple Music</TabsTrigger>
          </TabsList>

          {/* Spotify Tab */}
          <TabsContent value="spotify" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Spotify Playlist URL</label>
              <Input
                placeholder="https://open.spotify.com/playlist/..."
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Paste the link to a Spotify playlist (public or private)
              </p>
            </div>
            <Button
              onClick={handleSpotifyImport}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import from Spotify'
              )}
            </Button>
          </TabsContent>

          {/* YouTube Tab */}
          <TabsContent value="youtube" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">YouTube Playlist URL or ID</label>
              <Input
                placeholder="https://www.youtube.com/playlist?list=... or PLxxxxxx"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Paste a YouTube playlist URL (https://www.youtube.com/playlist?list=XXXXX) or just the playlist ID (e.g., PLxxxxxx). Note: Must be a playlist, not a single video.
              </p>
            </div>
            <Button
              onClick={handleYouTubeImport}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import from YouTube'
              )}
            </Button>
          </TabsContent>

          {/* Apple Music Tab */}
          <TabsContent value="apple" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Apple Music Playlist URL</label>
              <Input
                placeholder="https://music.apple.com/..."
                value={appleMusicUrl}
                onChange={(e) => setAppleMusicUrl(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Paste the link to an Apple Music playlist
              </p>
            </div>
            <Button
              onClick={handleAppleMusicImport}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import from Apple Music'
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Public playlists work best. Private playlists may require authentication.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
