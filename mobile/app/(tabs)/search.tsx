import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search as SearchIcon, X, Clock, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Layout } from '@/constants/layout';
import { TrackRow } from '@/components/music/TrackRow';
import { TrackCard } from '@/components/music/TrackCard';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  searchAll,
  searchTracks,
  getCategories,
  type Track,
  type SpotifyAlbum,
  type SpotifyArtist,
  type SpotifyCategory,
} from '@/lib/spotify';
import { useDebounce } from '@/hooks/useDebounce';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = 'sean_search_history';

const genreChips = [
  { name: 'Pop', color: '#EC4899', query: 'pop hits 2025' },
  { name: 'Hip-Hop', color: '#F97316', query: 'hip hop hits' },
  { name: 'Rock', color: '#EF4444', query: 'rock music' },
  { name: 'Electronic', color: '#06B6D4', query: 'electronic dance music' },
  { name: 'R&B', color: '#8B5CF6', query: 'r&b soul music' },
  { name: 'Latin', color: '#22C55E', query: 'latin reggaeton' },
  { name: 'Jazz', color: '#D97706', query: 'jazz music' },
  { name: 'Classical', color: '#64748B', query: 'classical music' },
];

export default function SearchScreen() {
  const { colors } = useTheme();
  const { playTrack } = usePlayer();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [trackResults, setTrackResults] = useState<Track[]>([]);
  const [albumResults, setAlbumResults] = useState<SpotifyAlbum[]>([]);
  const [artistResults, setArtistResults] = useState<SpotifyArtist[]>([]);
  const [categories, setCategories] = useState<SpotifyCategory[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    (async () => {
      try {
        const cats = await getCategories(20);
        setCategories(cats);
      } catch (e) {
        console.error('Failed to load categories:', e);
      } finally {
        setIsLoadingCategories(false);
      }
      // Load history
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) setSearchHistory(JSON.parse(stored));
    })();
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setTrackResults([]);
      setAlbumResults([]);
      setArtistResults([]);
      return;
    }
    (async () => {
      setIsSearching(true);
      try {
        const result = await searchAll(debouncedQuery, 15);
        setTrackResults(result.tracks);
        setAlbumResults(result.albums);
        setArtistResults(result.artists);
        // Save to history
        const newHistory = [debouncedQuery, ...searchHistory.filter((h) => h !== debouncedQuery)].slice(0, 15);
        setSearchHistory(newHistory);
        await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    })();
  }, [debouncedQuery]);

  const handleGenrePress = (genre: typeof genreChips[0]) => {
    setQuery(genre.name);
  };

  const handleHistoryPress = (term: string) => {
    setQuery(term);
  };

  const clearHistory = async () => {
    setSearchHistory([]);
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  const clearSearch = () => {
    setQuery('');
    setTrackResults([]);
    setAlbumResults([]);
    setArtistResults([]);
    Keyboard.dismiss();
  };

  const showResults = query.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <SearchIcon size={20} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search songs, artists, albums..."
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch} hitSlop={8}>
            <X size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Layout.nowPlayingBarHeight + Layout.tabBarHeight + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isSearching && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Searching...</Text>
          </View>
        )}

        {showResults ? (
          <>
            {/* Artists */}
            {artistResults.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Artists</Text>
                <FlatList
                  horizontal
                  data={artistResults}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: Layout.spacing.lg }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.artistCard}
                      onPress={() => router.push(`/artist/${item.id}`)}
                    >
                      <Image
                        source={{ uri: item.images[0]?.url }}
                        style={styles.artistImage}
                        contentFit="cover"
                        transition={200}
                      />
                      <Text style={[styles.artistName, { color: colors.foreground }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.artistGenre, { color: colors.mutedForeground }]} numberOfLines={1}>
                        Artist
                      </Text>
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
                />
              </View>
            )}

            {/* Albums */}
            {albumResults.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Albums</Text>
                <FlatList
                  horizontal
                  data={albumResults}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: Layout.spacing.lg }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.albumCard}
                      onPress={() => router.push(`/album/${item.id}`)}
                    >
                      <Image
                        source={{ uri: item.images[0]?.url }}
                        style={styles.albumImage}
                        contentFit="cover"
                        transition={200}
                      />
                      <Text style={[styles.albumName, { color: colors.foreground }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.albumArtist, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {item.artists.map((a) => a.name).join(', ')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                />
              </View>
            )}

            {/* Tracks */}
            {trackResults.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Songs</Text>
                {trackResults.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={index}
                    onPress={() => playTrack(track, trackResults)}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {/* Search History */}
            {searchHistory.length > 0 && (
              <View style={styles.section}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Searches</Text>
                  <TouchableOpacity onPress={clearHistory}>
                    <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
                  </TouchableOpacity>
                </View>
                {searchHistory.slice(0, 8).map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={styles.historyItem}
                    onPress={() => handleHistoryPress(term)}
                  >
                    <Clock size={16} color={colors.mutedForeground} />
                    <Text style={[styles.historyText, { color: colors.foreground }]}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Genre Chips */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Browse Genres</Text>
              <View style={styles.genreGrid}>
                {genreChips.map((genre) => (
                  <TouchableOpacity
                    key={genre.name}
                    style={[styles.genreChip, { backgroundColor: genre.color }]}
                    onPress={() => handleGenrePress(genre)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.genreChipText}>{genre.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Spotify Categories */}
            {categories.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Browse All</Text>
                <View style={styles.categoryGrid}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryCard, { backgroundColor: colors.card }]}
                      onPress={() => setQuery(cat.name)}
                      activeOpacity={0.7}
                    >
                      {cat.icons[0]?.url && (
                        <Image
                          source={{ uri: cat.icons[0].url }}
                          style={styles.categoryIcon}
                          contentFit="cover"
                        />
                      )}
                      <Text style={[styles.categoryName, { color: colors.foreground }]} numberOfLines={2}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Layout.spacing.lg,
    marginVertical: Layout.spacing.md,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: Layout.spacing.lg,
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  // Artists
  artistCard: {
    alignItems: 'center',
    width: 100,
    gap: 6,
  },
  artistImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  artistName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  artistGenre: {
    fontSize: 11,
    textAlign: 'center',
  },
  // Albums
  albumCard: {
    width: 140,
    gap: 6,
  },
  albumImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
  },
  albumName: {
    fontSize: 13,
    fontWeight: '600',
  },
  albumArtist: {
    fontSize: 11,
  },
  // History
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    marginBottom: 12,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 10,
  },
  historyText: {
    fontSize: 15,
  },
  // Genre Chips
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Layout.spacing.lg,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  genreChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Categories
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Layout.spacing.lg,
    gap: 10,
  },
  categoryCard: {
    width: '47%',
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    padding: 12,
    justifyContent: 'flex-end',
  },
  categoryIcon: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
  },
});
