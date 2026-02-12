import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Layout } from '@/constants/layout';
import { TrackCard } from '@/components/music/TrackCard';
import { TrackRow } from '@/components/music/TrackRow';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  searchTracks,
  getRecommendations,
  getNewReleases,
  normalizeTrack,
  type Track,
  type SpotifyAlbum,
} from '@/lib/spotify';
import { getRecentlyPlayed, getLikedTracks } from '@/lib/offline-storage';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { playTrack } = usePlayer();
  const insets = useSafeAreaInsets();
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [trending, setTrending] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<SpotifyAlbum[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [recs, trendingData, recent, liked] = await Promise.all([
        getRecommendations({ seedGenres: ['pop', 'hip-hop', 'rock'], limit: 20 }).catch(() => []),
        searchTracks('top hits 2025', 20).catch(() => []),
        getRecentlyPlayed().catch(() => []),
        getLikedTracks().catch(() => []),
      ]);
      setRecommendations(recs);
      setTrending(trendingData);
      setRecentlyPlayed(recent);
      setLikedTracks(liked);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handlePlayTrack = (track: Track, queue?: Track[]) => {
    playTrack(track, queue);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Skeleton width={180} height={36} />
        </View>
        <View style={styles.skeletonSection}>
          <Skeleton width={140} height={24} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <Skeleton width={150} height={150} borderRadius={Layout.radius.md} />
                <Skeleton width={120} height={14} style={{ marginTop: 8 }} />
                <Skeleton width={80} height={12} style={{ marginTop: 4 }} />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: Layout.nowPlayingBarHeight + Layout.tabBarHeight + 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>For You</Text>
      </View>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Made For You</Text>
          </View>
          <FlatList
            horizontal
            data={recommendations}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item }) => (
              <TrackCard track={item} onPress={() => handlePlayTrack(item, recommendations)} size="md" />
            )}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          />
        </View>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: Layout.spacing.lg }]}>
            Trending Now
          </Text>
          <FlatList
            horizontal
            data={trending}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item }) => (
              <TrackCard track={item} onPress={() => handlePlayTrack(item, trending)} size="md" />
            )}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          />
        </View>
      )}

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: Layout.spacing.lg }]}>
            Recently Played
          </Text>
          {recentlyPlayed.slice(0, 6).map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              onPress={() => handlePlayTrack(track, recentlyPlayed)}
            />
          ))}
        </View>
      )}

      {/* Liked Songs */}
      {likedTracks.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: Layout.spacing.lg }]}>
            Your Liked Songs
          </Text>
          <FlatList
            horizontal
            data={likedTracks.slice(0, 10)}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item }) => (
              <TrackCard track={item} onPress={() => handlePlayTrack(item, likedTracks)} size="sm" />
            )}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Layout.spacing.lg,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  horizontalList: {
    paddingHorizontal: Layout.spacing.lg,
  },
  row: {
    marginTop: 12,
    paddingLeft: Layout.spacing.lg,
  },
  skeletonSection: {
    padding: Layout.spacing.lg,
    gap: 12,
  },
  skeletonCard: {
    marginRight: 12,
  },
});
