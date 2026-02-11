'use client';

import { useEffect, useState } from 'react';
import { getTrendingMusic, type YouTubeVideo } from '@/lib/youtube';
import { getRecentlyPlayed, getLikedTracks } from '@/lib/offline-storage';
import { useEnhancedPlayer, type Song } from '@/contexts/enhanced-player-context';
import { TrackCard } from '@/components/music/track-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';
import { getRecommendations, type Recommendation } from '@/lib/recommendations';

export default function HomeClient() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [trending, setTrending] = useState<YouTubeVideo[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<YouTubeVideo[]>([]);
  const [likedTracks, setLikedTracks] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [recs, trendingData] = await Promise.all([
          getRecommendations(),
          getTrendingMusic(),
        ]);
        setRecommendations(recs);
        setTrending(trendingData);
      } catch (error) {
        console.error("Error loading home data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (mounted) {
      const loadOfflineData = async () => {
        const [recentData, likedData] = await Promise.all([
          getRecentlyPlayed(),
          getLikedTracks(),
        ]);
        setRecentlyPlayed(recentData);
        setLikedTracks(likedData);
      };
      loadOfflineData();
    }
  }, [mounted]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold text-foreground">For You</h1>

      {recommendations.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Made For You</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recommendations.map((track) => (
              <TrackCard key={track.id} track={track} showReason />
            ))}
          </div>
        </section>
      )}
      {trending.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Trending</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {trending.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </section>
      )}

      {mounted && recentlyPlayed.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Recently Played</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recentlyPlayed.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </section>
      )}

      {mounted && likedTracks.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Liked Songs</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {likedTracks.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
