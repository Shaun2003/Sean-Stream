import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Play, Users } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Layout } from '@/constants/layout';
import { TrackRow } from '@/components/music/TrackRow';
import {
  getArtist,
  getArtistTopTracks,
  getArtistAlbums,
  type Track,
  type SpotifyArtist,
  type SpotifyAlbum,
} from '@/lib/spotify';

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { playTrack, currentTrack } = usePlayer();
  const insets = useSafeAreaInsets();
  const [artist, setArtist] = useState<SpotifyArtist | null>(null);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) loadArtist();
  }, [id]);

  const loadArtist = async () => {
    try {
      const [artistData, tracks, artistAlbums] = await Promise.all([
        getArtist(id!),
        getArtistTopTracks(id!),
        getArtistAlbums(id!),
      ]);
      setArtist(artistData);
      setTopTracks(tracks);
      setAlbums(artistAlbums);
    } catch (error) {
      console.error('Error loading artist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!artist) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: colors.mutedForeground }}>Artist not found</Text>
      </View>
    );
  }

  const imageUrl = artist.images[0]?.url;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: Layout.nowPlayingBarHeight + 20 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
            <ChevronLeft size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {imageUrl && <Image source={{ uri: imageUrl }} style={styles.heroImage} contentFit="cover" />}
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.artistName} numberOfLines={2}>{artist.name}</Text>
            <View style={styles.followersRow}>
              <Users size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.followersText}>
                {formatFollowers(artist.followers.total)} followers
              </Text>
            </View>
            {artist.genres.length > 0 && (
              <View style={styles.genresRow}>
                {artist.genres.slice(0, 3).map((g) => (
                  <View key={g} style={styles.genreChip}>
                    <Text style={styles.genreText}>{g}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Play All */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.playAllButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (topTracks.length > 0) playTrack(topTracks[0], topTracks);
            }}
          >
            <Play size={18} color={colors.primaryForeground} fill={colors.primaryForeground} />
            <Text style={[styles.playAllText, { color: colors.primaryForeground }]}>Play Top Tracks</Text>
          </TouchableOpacity>
        </View>

        {/* Popular Tracks */}
        {topTracks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Popular</Text>
            {topTracks.slice(0, 5).map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index}
                showIndex
                isPlaying={currentTrack?.id === track.id}
                onPress={() => playTrack(track, topTracks)}
              />
            ))}
          </View>
        )}

        {/* Albums */}
        {albums.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Discography</Text>
            <FlatList
              horizontal
              data={albums}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: Layout.spacing.lg }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.albumCard}
                  onPress={() => router.push(`/album/${item.id}`)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.images[0]?.url }}
                    style={styles.albumCover}
                    contentFit="cover"
                    transition={200}
                  />
                  <Text style={[styles.albumTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.albumYear, { color: colors.mutedForeground }]}>
                    {item.release_date?.split('-')[0]}
                  </Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    height: 320,
    position: 'relative',
    overflow: 'hidden',
  },
  backButton: {
    position: 'absolute',
    top: 8,
    left: Layout.spacing.lg,
    zIndex: 10,
    padding: 8,
  },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: 24,
  },
  artistName: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  followersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  followersText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  genresRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  genreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 14,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 24,
  },
  playAllText: {
    fontSize: 16,
    fontWeight: '700',
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
  albumCard: {
    width: 140,
    gap: 6,
  },
  albumCover: {
    width: 140,
    height: 140,
    borderRadius: 8,
  },
  albumTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  albumYear: {
    fontSize: 11,
  },
});
