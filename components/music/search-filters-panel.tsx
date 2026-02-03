"use client";

import { useState } from "react";
import type { SearchFilters } from "@/lib/search-filters";
import {
  GENRES,
  DURATION_FILTERS,
  SORT_OPTIONS,
  filterTracks,
} from "@/lib/search-filters";
import type { YouTubeVideo } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface SearchFiltersPanelProps {
  tracks: YouTubeVideo[];
  onFilterChange: (tracks: YouTubeVideo[]) => void;
}

export function SearchFiltersPanel({
  tracks,
  onFilterChange,
}: SearchFiltersPanelProps) {
  const [filters, setFilters] = useState<Partial<SearchFilters>>({
    sortBy: "relevance",
  });
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    const filtered = filterTracks(tracks, updated);
    onFilterChange(filtered);
  };

  const hasActiveFilters =
    filters.genre || filters.artist || filters.duration || filters.year;

  const clearFilters = () => {
    setFilters({ sortBy: "relevance" });
    onFilterChange(tracks);
  };

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start"
      >
        🔽 Filters {hasActiveFilters && `(${Object.keys(filters).length - 1})`}
      </Button>

      {isOpen && (
        <Card className="p-4 space-y-4">
          {/* Genre */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Genre</label>
            <Select
              value={filters.genre || ""}
              onValueChange={(value) =>
                handleFilterChange({
                  genre: value || undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All genres</SelectItem>
                {GENRES.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Duration</label>
            <Select
              value={
                filters.duration
                  ? `${filters.duration.min}-${filters.duration.max}`
                  : ""
              }
              onValueChange={(value) => {
                const duration = DURATION_FILTERS.find(
                  (d) => `${d.min}-${d.max}` === value
                );
                handleFilterChange({
                  duration: duration
                    ? { min: duration.min, max: duration.max }
                    : undefined,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any length" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any length</SelectItem>
                {DURATION_FILTERS.map((d) => (
                  <SelectItem key={d.value} value={d.value || ""}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Artist */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Artist</label>
            <Input
              placeholder="Filter by artist"
              value={filters.artist || ""}
              onChange={(e) =>
                handleFilterChange({
                  artist: e.target.value || undefined,
                })
              }
            />
          </div>

          {/* Year */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Year</label>
            <Input
              placeholder="e.g., 2024"
              value={filters.year || ""}
              onChange={(e) =>
                handleFilterChange({
                  year: e.target.value || undefined,
                })
              }
            />
          </div>

          {/* Sort */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sort By</label>
            <Select
              value={filters.sortBy || "relevance"}
              onValueChange={(value) =>
                handleFilterChange({
                  sortBy: value as SearchFilters["sortBy"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value || "relevance"} value={option.value || "relevance"}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear button */}
          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              onClick={clearFilters}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
