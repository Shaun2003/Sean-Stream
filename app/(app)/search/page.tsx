"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchYouTube, getTrendingMusic, type YouTubeVideo } from "@/lib/youtube";
import { TrackCard } from "@/components/music/track-card";
import { TrackRow } from "@/components/music/track-row";
import { usePlayer, type Song } from "@/contexts/player-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";

const genreSearches = [
  { name: "Pop", color: "from-pink-500 to-rose-500", query: "pop hits 2024" },
  { name: "Hip-Hop", color: "from-orange-500 to-amber-500", query: "hip hop hits" },
  { name: "Rock", color: "from-red-600 to-red-400", query: "rock music" },
  { name: "Electronic", color: "from-cyan-500 to-blue-500", query: "electronic dance music" },
  { name: "R&B", color: "from-purple-600 to-violet-400", query: "r&b soul music" },
  { name: "Latin", color: "from-green-500 to-emerald-400", query: "latin music reggaeton" },
  { name: "Jazz", color: "from-amber-600 to-yellow-400", query: "jazz music" },
  { name: "Classical", color: "from-slate-500 to-gray-400", query: "classical music" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [trending, setTrending] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 500);
  const { playQueue } = usePlayer();

  // Load trending on mount
  useEffect(() => {
    async function loadTrending() {
      setIsLoadingTrending(true);
      try {
        const data = await getTrendingMusic();
        setTrending(data);
      } catch (error) {
        console.error("[v0] Error loading trending:", error);
      } finally {
        setIsLoadingTrending(false);
      }
    }
    loadTrending();
  }, []);

  // Search when query changes
  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { videos } = await searchYouTube(debouncedQuery);
        setResults(videos);
      } catch (error) {
        console.error("[v0] Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }
    performSearch();
  }, [debouncedQuery]);

  const handleGenreClick = async (genre: { name: string; query: string }) => {
    setSelectedGenre(genre.name);
    setQuery(genre.name);
    setIsSearching(true);
    try {
      const { videos } = await searchYouTube(genre.query);
      setResults(videos);
    } catch (error) {
      console.error("[v0] Genre search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSelectedGenre(null);
  };

  const handlePlayAll = () => {
    const tracks = results.length > 0 ? results : trending;
    if (tracks.length > 0) {
      playQueue(tracks as Song[]);
    }
  };

  const showResults = query.trim() || selectedGenre;

  return (
    <div className="space-y-8">
      {/* Search Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Search</h1>

        {/* Search Input */}
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="What do you want to play?"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedGenre(null);
            }}
            className="pl-12 pr-12 h-12 bg-card border-0 rounded-full text-base"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8"
              onClick={clearSearch}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isSearching && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Search Results */}
      {!isSearching && showResults && results.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">
              {selectedGenre ? `${selectedGenre} Music` : `Results for "${query}"`}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={handlePlayAll}
            >
              Play all
            </Button>
          </div>

          {/* Top Result + Songs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
            {/* Top Result */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Top result</h3>
              <TopResultCard track={results[0]} />
            </div>

            {/* Songs List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Songs</h3>
              <div className="space-y-1">
                {results.slice(1, 5).map((track, index) => (
                  <TrackRow key={track.id} track={track} index={index + 1} />
                ))}
              </div>
            </div>
          </div>

          {/* All Results Grid */}
          {results.length > 5 && (
            <div className="pt-4">
              <h3 className="text-xl font-bold text-foreground mb-4">More Results</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {results.slice(5).map((track) => (
                  <TrackCard key={track.id} track={track} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* No Results */}
      {!isSearching && showResults && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No results found for "{query}"</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try searching for something else
          </p>
        </div>
      )}

      {/* Browse All (when not searching) */}
      {!showResults && !isSearching && (
        <>
          {/* Genre Cards */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Browse all</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {genreSearches.map((genre) => (
                <button
                  key={genre.name}
                  onClick={() => handleGenreClick(genre)}
                  className={`relative h-24 md:h-28 rounded-lg bg-gradient-to-br ${genre.color} p-4 text-left overflow-hidden hover:scale-[1.02] transition-transform`}
                >
                  <h3 className="text-lg md:text-xl font-bold text-foreground">
                    {genre.name}
                  </h3>
                </button>
              ))}
            </div>
          </section>

          {/* Trending Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Trending Searches</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={handlePlayAll}
              >
                Play all
              </Button>
            </div>
            {isLoadingTrending ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {trending.slice(0, 12).map((track) => (
                  <TrackCard key={track.id} track={track} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function TopResultCard({ track }: { track: YouTubeVideo }) {
  const { playSong, currentSong, isPlaying, togglePlayPause } = usePlayer();

  const isCurrentTrack = currentSong?.id === track.id;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;

  const handlePlay = () => {
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      playSong(track as Song);
    }
  };

  return (
    <div
      onClick={handlePlay}
      className="group relative p-5 rounded-lg bg-card hover:bg-card/80 transition-colors cursor-pointer"
    >
      <div className="w-24 h-24 md:w-28 md:h-28 rounded-lg overflow-hidden bg-secondary shadow-lg mb-4">
        {track.thumbnail ? (
          <img
            src={track.thumbnail || "/placeholder.svg"}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
            <span className="text-3xl font-bold text-primary">
              {track.title[0]}
            </span>
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-foreground line-clamp-1 mb-1">
        {track.title}
      </h3>
      <p className="text-sm text-muted-foreground">{track.artist}</p>
      <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold bg-secondary rounded-full">
        Song
      </span>

      {/* Play button */}
      <div
        className={`absolute bottom-5 right-5 transition-all duration-200 ${
          isCurrentlyPlaying
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
        }`}
      >
        <Button
          size="icon"
          className="w-12 h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 shadow-xl transition-transform"
        >
          {isCurrentlyPlaying ? (
            <span className="flex gap-0.5">
              {[...Array(3)].map((_, i) => (
                <span
                  key={i}
                  className="w-1 bg-primary-foreground rounded-full animate-pulse"
                  style={{
                    height: `${10 + Math.random() * 8}px`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </span>
          ) : (
            <span className="w-5 h-5 border-l-[12px] border-y-[8px] border-y-transparent border-l-primary-foreground ml-1" />
          )}
        </Button>
      </div>
    </div>
  );
}
