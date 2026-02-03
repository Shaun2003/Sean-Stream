"use client";

import { useEffect, useState } from "react";
import {
  getListeningStats,
  getTopTracks,
  getTopArtists,
  formatListeningTime,
  type ListeningStats,
  type TrackStats,
  type ArtistStats,
} from "@/lib/stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Headphones, TrendingUp, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function StatsWidget() {
  const [stats, setStats] = useState<ListeningStats | null>(null);
  const [topTracks, setTopTracks] = useState<TrackStats[]>([]);
  const [topArtists, setTopArtists] = useState<ArtistStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      try {
        const [statsData, tracks, artists] = await Promise.all([
          getListeningStats(),
          getTopTracks(5),
          getTopArtists(5),
        ]);

        setStats(statsData);
        setTopTracks(tracks);
        setTopArtists(artists);
      } catch (error) {
        console.error("[Stats] Error loading stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No listening data yet. Start playing music to see your stats!
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="top-tracks">Top Tracks</TabsTrigger>
        <TabsTrigger value="top-artists">Top Artists</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Plays
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.topTracks.reduce((sum, t) => sum + t.playCount, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unique Tracks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTracks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Artists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalArtists}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Listening Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatListeningTime(stats.totalListeningTime)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Stats</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Listening Time</p>
              <p className="text-xl font-semibold">
                {formatListeningTime(stats.thisWeekListeningTime)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Time</p>
              <p className="text-xl font-semibold">
                {formatListeningTime(stats.thisMonthListeningTime)}
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="top-tracks" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Your Top Tracks</CardTitle>
            <CardDescription>Most played songs</CardDescription>
          </CardHeader>
          <CardContent>
            {topTracks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-3">
                {topTracks.map((track, index) => (
                  <div
                    key={track.trackId}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                      <span className="text-xs font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.artist}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Headphones className="h-3 w-3" />
                      <span>{track.playCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="top-artists" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Artists</CardTitle>
            <CardDescription>Your favorite artists</CardDescription>
          </CardHeader>
          <CardContent>
            {topArtists.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-3">
                {topArtists.map((artist, index) => (
                  <div
                    key={artist.artist}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                      <span className="text-xs font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{artist.artist}</p>
                      <p className="text-xs text-muted-foreground">
                        {artist.topTracks.length} tracks
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <TrendingUp className="h-3 w-3" />
                      <span>{artist.playCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
