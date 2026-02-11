'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useEnhancedPlayer, type Song } from '@/contexts/enhanced-player-context';
import { TrackRow } from '@/components/music/track-row';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Play, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Artist = {
  id: string;
  name: string;
  bio: string;
  albums: any[];
  songs: Song[];
};

type ArtistPageProps = {
  params: {
    id: string;
  };
};

export default function ArtistPage({ params }: ArtistPageProps) {
  const router = useRouter();
  const { playQueue } = useEnhancedPlayer();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadArtist() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('artists')
          .select('*, albums(*), songs(*)')
          .eq('id', params.id)
          .single();
        
        if (error) throw error;
        setArtist(data);
      } catch (error) {
        console.error("[ARTIST_PAGE] Error loading artist:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      loadArtist();
    }
  }, [params.id]);

  const handlePlayAll = () => {
    if (artist && artist.songs.length > 0) {
      playQueue(artist.songs);
    }
  };

  if (isLoading) {
    return <ArtistPageSkeleton />;
  }

  if (!artist) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Artist Not Found</h1>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">{artist.name}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">{artist.bio}</p>
        </div>

        <div className="flex justify-center">
          <Button onClick={handlePlayAll} size="lg">
            <Play className="w-5 h-5 mr-2" />
            Play All
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Albums</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {artist.albums.map((album) => (
            <Link href={`/album/${album.id}`} key={album.id} className="group space-y-2">
              <div className="aspect-square rounded-md overflow-hidden bg-secondary">
                <img src={album.cover_url ?? ''} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div>
                <p className="font-semibold truncate">{album.name}</p>
                <p className="text-sm text-muted-foreground">{album.release_year}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Top Songs</h2>
        <div className="space-y-1">
          {artist.songs.map((song, index) => (
            <TrackRow key={song.id} track={song} index={index + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ArtistPageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
       <Skeleton className="h-6 w-20" />
      <div className="space-y-6 text-center">
        <Skeleton className="h-10 w-1/2 mx-auto" />
        <Skeleton className="h-4 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-2/3 mx-auto" />
        <div className="flex justify-center">
          <Skeleton className="h-12 w-32 rounded-full" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-md" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
