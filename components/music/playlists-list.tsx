'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Music, Trash2, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface PlaylistsListProps {
  onPlaylistDeleted?: () => void;
  showDelete?: boolean;
}

export function PlaylistsList({ onPlaylistDeleted, showDelete = true }: PlaylistsListProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/playlists/list');
      
      if (!response.ok) {
        throw new Error('Failed to load playlists');
      }

      const { data } = await response.json();
      setPlaylists(data || []);
    } catch (error) {
      console.error('Error loading playlists:', error);
      toast({
        title: 'Error',
        description: 'Failed to load playlists',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (playlistId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this playlist?')) {
      return;
    }

    try {
      setDeletingId(playlistId);
      const response = await fetch(`/api/playlists/update?id=${playlistId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete playlist');
      }

      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      toast({ title: 'Success', description: 'Playlist deleted' });
      onPlaylistDeleted?.();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete playlist',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="text-center py-12">
        <Music className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No playlists yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {playlists.map((playlist) => (
        <Link
          key={playlist.id}
          href={`/playlists/${playlist.id}`}
          className="group"
        >
          <div className="relative h-40 bg-linear-to-br from-primary/30 to-primary/10 rounded-lg overflow-hidden">
            {playlist.cover_url ? (
              <img
                src={playlist.cover_url}
                alt={playlist.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-16 h-16 text-primary/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {showDelete && (
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDelete(playlist.id, e)}
                disabled={deletingId === playlist.id}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <div className="mt-2">
            <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
              {playlist.name}
            </h3>
            {playlist.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {playlist.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {playlist.is_public ? (
                <>
                  <Globe className="w-3 h-3" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  <span>Private</span>
                </>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

