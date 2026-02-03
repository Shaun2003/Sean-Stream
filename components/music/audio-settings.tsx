"use client";

import { useEffect, useState } from "react";
import {
  getUserAudioPreferences,
  updateAudioPreferences,
  setEqualizerPreset,
  setPlaybackSpeed,
  setCrossfade,
  getAllEqualizerPresets,
  type UserAudioPreferences,
} from "@/lib/audio-preferences";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AudioSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AudioSettings({ isOpen, onClose }: AudioSettingsProps) {
  const [preferences, setPreferences] = useState<UserAudioPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const presets = getAllEqualizerPresets();

  useEffect(() => {
    if (!isOpen) return;

    async function loadPreferences() {
      setIsLoading(true);
      try {
        const prefs = await getUserAudioPreferences();
        setPreferences(prefs);
      } catch (error) {
        console.error("[Audio Settings] Error loading preferences:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, [isOpen]);

  const handleEqualizerChange = async (preset: string) => {
    await setEqualizerPreset(preset as any);
    const updated = await getUserAudioPreferences();
    setPreferences(updated);
  };

  const handleSpeedChange = async (speed: number) => {
    await setPlaybackSpeed(speed);
    const updated = await getUserAudioPreferences();
    setPreferences(updated);
  };

  const handleCrossfadeChange = async (duration: number) => {
    await setCrossfade(duration);
    const updated = await getUserAudioPreferences();
    setPreferences(updated);
  };

  const handleQualityChange = async (quality: string) => {
    await updateAudioPreferences({ audioQuality: quality as any });
    const updated = await getUserAudioPreferences();
    setPreferences(updated);
  };

  if (!preferences && !isLoading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Audio Settings</DialogTitle>
          <DialogDescription>Customize your audio experience</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Equalizer */}
            <div className="space-y-2">
              <Label>Equalizer Preset</Label>
              <Select value={preferences?.equalizerPreset || "normal"} onValueChange={handleEqualizerChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div>
                        <p className="font-medium">{preset.name}</p>
                        <p className="text-xs text-muted-foreground">{preset.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Playback Speed */}
            <div className="space-y-2">
              <Label>Playback Speed: {preferences?.playbackSpeed.toFixed(1)}x</Label>
              <Slider
                min={0.5}
                max={2}
                step={0.1}
                value={[preferences?.playbackSpeed || 1]}
                onValueChange={(value) => handleSpeedChange(value[0])}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">0.5x - 2.0x</p>
            </div>

            {/* Crossfade */}
            <div className="space-y-2">
              <Label>Crossfade Duration: {preferences?.crossfadeDuration}s</Label>
              <Slider
                min={0}
                max={10}
                step={1}
                value={[preferences?.crossfadeDuration || 0]}
                onValueChange={(value) => handleCrossfadeChange(value[0])}
                className="w-full"
              />
            </div>

            {/* Audio Quality */}
            <div className="space-y-2">
              <Label>Audio Quality</Label>
              <Select value={preferences?.audioQuality || "high"} onValueChange={handleQualityChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (64kbps)</SelectItem>
                  <SelectItem value="normal">Normal (128kbps)</SelectItem>
                  <SelectItem value="high">High (256kbps)</SelectItem>
                  <SelectItem value="very-high">Very High (320kbps)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gapless Playback */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Gapless Playback</Label>
                <input
                  type="checkbox"
                  checked={preferences?.gaplessPlayback || false}
                  onChange={(e) =>
                    updateAudioPreferences({ gaplessPlayback: e.target.checked })
                  }
                  className="rounded"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Remove silence between tracks
              </p>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
