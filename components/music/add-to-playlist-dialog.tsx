'use client';

import { useState, useEffect } from 'react';
import { usePlayer } from '@/contexts/player-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { durationToSeconds } from '@/lib/youtube';
import type { Song } from '@/contexts/player-context';

interface Playlist {
  id: string;
  name: string;
  description?: string;
}

interface AddToPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song?: Song; // Optional prop - if provided, use this song instead of currentSong
  onAddSuccess?: () => void; // Optional callback when a song is successfully added
}

export function AddToPlaylistDialog({ open, onOpenChange, song: propSong, onAddSuccess }: AddToPlaylistDialogProps) {
  const { currentSong: playerSong } = usePlayer();
  // Use provided song prop, fall back to currently playing song
  const currentSong = propSong || playerSong;
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingTo, setAddingTo] = useState<Set<string>>(new Set());
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  useEffect(() => {
    if (open) {
      loadPlaylists();
    }
  }, [open]);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/playlists/list');
      if (!response.ok) throw new Error('Failed to load playlists');
      const { data } = await response.json();
      setPlaylists(data || []);
    } catch (error) {
      console.error('Error loading playlists:', error);
      toast({ title: 'Error', description: 'Failed to load playlists', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!currentSong) return;

    setAddingTo((prev) => new Set([...prev, playlistId]));
    
    try {
      const response = await fetch('/api/playlists/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlist_id: playlistId,
          video_id: currentSong.id,
          title: currentSong.title,
          artist: currentSong.channelTitle,
          thumbnail: currentSong.thumbnail,
          duration: durationToSeconds(currentSong.duration),
        }),
      });

      console.log('[v0] Add to playlist response status:', response.status);

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = {};
      }
      console.log('[v0] Add to playlist response data:', responseData);

      // Handle 409 Conflict (track already in playlist)
      if (response.status === 409) {
        console.log('[v0] 409 Conflict - track already in playlist');
        toast({ 
          title: 'Info', 
          description: responseData?.error || 'Track already in this playlist' 
        });
        return;
      }

      // Handle other non-ok responses
      if (!response.ok) {
        const errorMessage = responseData?.error || 'Failed to add to playlist';
        toast({ 
          title: 'Error', 
          description: errorMessage,
          variant: 'destructive' 
        });
        return;
      }
      
      toast({ title: 'Success', description: 'Added to playlist' });
      // Call the success callback if provided
      onAddSuccess?.();
    } catch (error) {
      console.error('[v0] Error adding to playlist:', error);
      const message = error instanceof Error ? error.message : 'Failed to add to playlist';
      toast({ 
        title: 'Error', 
        description: message, 
        variant: 'destructive' 
      });
    } finally {
      setAddingTo((prev) => {
        const next = new Set(prev);
        next.delete(playlistId);
        return next;
      });
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newPlaylistName.trim() || !currentSong) return;

    try {
      setCreatingPlaylist(true);
      const createResponse = await fetch('/api/playlists/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlaylistName.trim() }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create playlist');
      }

      const { data: newPlaylist } = await createResponse.json();

      // Add track to new playlist
      const addResponse = await fetch('/api/playlists/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlist_id: newPlaylist.id,
          video_id: currentSong.id,
          title: currentSong.title,
          artist: currentSong.channelTitle,
          thumbnail: currentSong.thumbnail,
          duration: durationToSeconds(currentSong.duration),
        }),
      });

      if (!addResponse.ok) {
        const errorData = await addResponse.json();
        throw new Error(errorData.error || 'Failed to add track to playlist');
      }

      toast({ title: 'Success', description: 'Playlist created and track added' });
      setNewPlaylistName('');
      setShowNewPlaylist(false);
      loadPlaylists();
    } catch (error) {
      console.error('Error:', error);
      const message = error instanceof Error ? error.message : 'Failed to create playlist';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setCreatingPlaylist(false);
    }
  };

  if (!currentSong) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add to Playlist</DialogTitle>
          <DialogDescription className="truncate">
            Adding "{currentSong.title}" to...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {loading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </>
          ) : playlists.length > 0 ? (
            playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => handleAddToPlaylist(playlist.id)}
                disabled={addingTo.has(playlist.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="font-medium">{playlist.name}</p>
                  {playlist.description && (
                    <p className="text-xs text-muted-foreground">{playlist.description}</p>
                  )}
                </div>
                {addingTo.has(playlist.id) ? (
                  <div className="animate-spin">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 2v4m0 12v4m10-10h-4m-12 0H2"
                      />
                    </svg>
                  </div>
                ) : (
                  <Check className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100" />
                )}
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No playlists yet</p>
          )}
        </div>

        {!showNewPlaylist ? (
          <Button
            onClick={() => setShowNewPlaylist(true)}
            variant="outline"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Playlist
          </Button>
        ) : (
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="new-playlist-name">Playlist Name</Label>
            <Input
              id="new-playlist-name"
              placeholder="Enter playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              disabled={creatingPlaylist}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewPlaylist(false);
                  setNewPlaylistName('');
                }}
                disabled={creatingPlaylist}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAndAdd}
                disabled={!newPlaylistName.trim() || creatingPlaylist}
              >
                {creatingPlaylist ? 'Creating...' : 'Create & Add'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
