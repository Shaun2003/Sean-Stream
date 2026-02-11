"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, Delete, Play, Radio } from "lucide-react";
import {
  generateRadioStation,
  getSavedRadioStations,
  deleteRadioStation,
  type RadioStation,
} from "@/lib/radio-station";
import { useEnhancedPlayer } from "@/contexts/enhanced-player-context";
import { useToast } from "@/hooks/use-toast";

export default function RadioStationsPage() {
  const { playQueue } = useEnhancedPlayer();
  const { toast } = useToast();
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRadioStations();
  }, []);

  const loadRadioStations = async () => {
    try {
      setIsLoading(true);
      const data = getSavedRadioStations();
      setStations(data);
    } catch (error) {
      console.error("Error loading radio stations:", error);
      toast({
        title: "Error",
        description: "Failed to load radio stations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStation = async (id: string) => {
    try {
      deleteRadioStation(id);
      setStations((prev) => prev.filter((s) => s.id !== id));
      toast({
        title: "Deleted",
        description: "Radio station removed",
      });
    } catch (error) {
      console.error("Error deleting station:", error);
      toast({
        title: "Error",
        description: "Failed to delete radio station",
        variant: "destructive",
      });
    }
  };

  const handlePlayStation = (station: RadioStation) => {
    if (station.generatedQueue.length > 0) {
      playQueue(
        station.generatedQueue.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.channelTitle,
          image: t.thumbnail.url,
        }))
      );
      toast({
        title: "Now Playing",
        description: `${station.baseSongTitle} Radio`,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <h1 className="text-3xl font-bold mb-8">Radio Stations</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Radio className="w-8 h-8 text-primary" />
          Radio Stations
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate custom radio stations based on any song
        </p>
      </div>

      {stations.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <Radio className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">No radio stations yet</h2>
            <p className="text-muted-foreground">
              Go to a song and create a radio station to get started
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stations.map((station) => (
            <Card
              key={station.id}
              className="flex flex-col overflow-hidden hover:shadow-lg transition"
            >
              <div className="p-6 space-y-4 flex-1">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">
                    Based on
                  </p>
                  <h3 className="text-lg font-semibold line-clamp-1">
                    {station.baseSongTitle}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {station.baseSongArtist}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Music className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {station.generatedQueue.length} songs
                  </span>
                </div>
              </div>

              <div className="flex gap-2 p-6 border-t">
                <Button
                  className="flex-1"
                  onClick={() => handlePlayStation(station)}
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleDeleteStation(station.id)}
                  size="sm"
                >
                  <Delete className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
