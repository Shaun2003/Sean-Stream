import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Play, Shuffle, ListMusic } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Layout } from '@/constants/layout';
import { TrackRow } from '@/components/music/TrackRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabase';
import type { Track } from '@/lib/spotify';

interface PlaylistData {
  id: string;
  name: string;
  description: string | null;
  track_count: number;
}

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { playTrack, currentTrack } = usePlayer();
  const insets = useSafeAreaInsets();
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) loadPlaylist();
  }, [id]);

  const loadPlaylist = async () => {
    try {
      const { data: playlistData } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', id!)
        .single();

      if (playlistData) {
        setPlaylist(playlistData);
      }

      const { data: trackData } = await supabase
        .from('playlist_tracks')
        .select('*')
        .eq('playlist_id', id!)
        .order('position', { ascending: true });

      if (trackData) {
        setTracks(
          trackData.map((t: any) => ({
            id: t.track_id || t.id,
            title: t.track_title || 'Unknown',
            artist: t.track_artist || 'Unknown',
            album: t.track_album || '',
            coverUrl: t.track_cover_url || '',
            duration: t.track_duration || 0,
            spotifyId: t.spotify_id || '',
          }))
        );
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) playTrack(tracks[0], tracks);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {playlist?.name || 'Playlist'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Layout.nowPlayingBarHeight + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Playlist Info */}
        <View style={styles.infoSection}>
          <View style={[styles.playlistIcon, { backgroundColor: colors.primary }]}>
            <ListMusic size={40} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.playlistName, { color: colors.foreground }]}>{playlist?.name}</Text>
          {playlist?.description && (
            <Text style={[styles.playlistDesc, { color: colors.mutedForeground }]}>{playlist.description}</Text>
          )}
          <Text style={[styles.trackCount, { color: colors.mutedForeground }]}>{tracks.length} tracks</Text>
        </View>

        {tracks.length > 0 ? (
          <>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.playButton, { backgroundColor: colors.primary }]} onPress={handlePlayAll}>
                <Play size={22} color={colors.primaryForeground} fill={colors.primaryForeground} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shuffleButton, { backgroundColor: colors.secondary }]} onPress={handleShuffle}>
                <Shuffle size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            {tracks.map((track, index) => (
              <TrackRow
                key={track.id + index}
                track={track}
                index={index}
                showIndex
                isPlaying={currentTrack?.id === track.id}
                onPress={() => playTrack(track, tracks)}
              />
            ))}
          </>
        ) : (
          <EmptyState
            icon="music"
            title="No tracks yet"
            description="Add tracks to this playlist from search or your library."
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  infoSection: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  playlistIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  playlistName: { fontSize: 24, fontWeight: '700' },
  playlistDesc: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  trackCount: { fontSize: 13 },
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
