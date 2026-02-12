import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Play, Shuffle, Heart } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Layout } from '@/constants/layout';
import { TrackRow } from '@/components/music/TrackRow';
import { getAlbum, getAlbumTracks, normalizeTrack, type Track, type SpotifyAlbum } from '@/lib/spotify';

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { playTrack, currentTrack } = usePlayer();
  const insets = useSafeAreaInsets();
  const [album, setAlbum] = useState<SpotifyAlbum | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) loadAlbum();
  }, [id]);

  const loadAlbum = async () => {
    try {
      const [albumData, albumTracks] = await Promise.all([
        getAlbum(id!),
        getAlbumTracks(id!),
      ]);
      setAlbum(albumData);
      setTracks(albumTracks);
    } catch (error) {
      console.error('Error loading album:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!album) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: colors.mutedForeground }}>Album not found</Text>
      </View>
    );
  }

  const coverUrl = album.images[0]?.url;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: Layout.nowPlayingBarHeight + 20 }} showsVerticalScrollIndicator={false}>
        {/* Header with artwork */}
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
            <ChevronLeft size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {coverUrl && (
            <Image source={{ uri: coverUrl }} style={styles.heroImage} contentFit="cover" />
          )}
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Image source={{ uri: coverUrl }} style={styles.albumArt} contentFit="cover" transition={200} />
            <Text style={styles.albumName} numberOfLines={2}>{album.name}</Text>
            <Text style={styles.albumArtist}>{album.artists.map((a) => a.name).join(', ')}</Text>
            <Text style={styles.albumMeta}>
              {album.release_date?.split('-')[0]} {album.total_tracks} tracks
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.playButton, { backgroundColor: colors.primary }]} onPress={handlePlayAll}>
            <Play size={22} color={colors.primaryForeground} fill={colors.primaryForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shuffleButton, { backgroundColor: colors.secondary }]} onPress={handleShuffle}>
            <Shuffle size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Track List */}
        {tracks.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index}
            showIndex
            isPlaying={currentTrack?.id === track.id}
            onPress={() => playTrack(track, tracks)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    height: 360,
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
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
    paddingHorizontal: Layout.spacing.lg,
  },
  albumArt: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },
  albumName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  albumArtist: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginTop: 4,
  },
  albumMeta: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 14,
    gap: 12,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shuffleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
