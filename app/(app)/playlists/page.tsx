'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { CreatePlaylistDialog } from '@/components/music/create-playlist-dialog';
import { PlaylistsList } from '@/components/music/playlists-list';

export default function PlaylistsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePlaylistCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handlePlaylistDeleted = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <PageHeader 
        title="Your Playlists"
        action={
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2" size="sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Playlist</span>
          </Button>
        }
      />

      {/* Main Content */}
      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        <PlaylistsList
          key={refreshKey}
          onPlaylistDeleted={handlePlaylistDeleted}
          showDelete={true}
        />
      </div>

      {/* Dialogs */}
      <CreatePlaylistDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onPlaylistCreated={handlePlaylistCreated}
      />
    </div>
  );
}
