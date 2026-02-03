"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Palette } from "lucide-react";

export interface PlaylistCover {
  type: "color" | "gradient" | "image";
  value: string;
}

interface PlaylistCoverCustomizerProps {
  currentCover?: PlaylistCover;
  playlistId: string;
  playlistName: string;
  onCoverChange: (cover: PlaylistCover) => void;
}

const COLOR_PRESETS = [
  "#FF6B6B", // Red
  "#FF8E72", // Orange
  "#FFD93D", // Yellow
  "#6BCB77", // Green
  "#4D96FF", // Blue
  "#A569BD", // Purple
  "#FF69B4", // Pink
  "#20B2AA", // Teal
  "#FF1493", // Deep Pink
  "#00CED1", // Dark Turquoise
];

const GRADIENT_PRESETS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
];

export function PlaylistCoverCustomizer({
  currentCover,
  playlistId,
  playlistName,
  onCoverChange,
}: PlaylistCoverCustomizerProps) {
  const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(currentCover?.value || COLOR_PRESETS[0]);
  const { toast } = useToast();

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    onCoverChange({ type: "color", value: color });
    toast({
      title: "Cover updated",
      description: "Playlist cover has been changed",
    });
  };

  const handleGradientSelect = (gradient: string) => {
    setSelectedColor(gradient);
    onCoverChange({ type: "gradient", value: gradient });
    toast({
      title: "Cover updated",
      description: "Playlist cover gradient applied",
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        onCoverChange({ type: "image", value: imageUrl });
        toast({
          title: "Cover updated",
          description: "Playlist cover image uploaded",
        });
        setOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const previewStyle =
    currentCover?.type === "gradient"
      ? { background: currentCover.value }
      : currentCover?.type === "color"
        ? { backgroundColor: currentCover.value }
        : currentCover?.type === "image"
          ? { backgroundImage: `url(${currentCover.value})`, backgroundSize: "cover" }
          : { backgroundColor: selectedColor };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          Customize Cover
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Playlist Cover</DialogTitle>
          <DialogDescription>Choose a color, gradient, or upload an image</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          <div
            className="h-40 rounded-lg border-2 border-border transition-all"
            style={previewStyle}
          />

          {/* Colors */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Colors</p>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    selectedColor === color ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Gradients */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Gradients</p>
            <div className="grid grid-cols-3 gap-2">
              {GRADIENT_PRESETS.map((gradient, idx) => (
                <button
                  key={idx}
                  className={`h-12 rounded-lg border-2 transition-all ${
                    selectedColor === gradient ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ background: gradient }}
                  onClick={() => handleGradientSelect(gradient)}
                  aria-label={`Gradient ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Upload Image</p>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">Max 5MB image</p>
          </div>

          <Button onClick={() => setOpen(false)} className="w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
