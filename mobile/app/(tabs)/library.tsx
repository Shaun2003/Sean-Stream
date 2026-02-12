import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Clock, Download, Play, Shuffle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Layout } from '@/constants/layout';
import { TrackRow } from '@/components/music/TrackRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { getLikedTracks, getRecentlyPlayed, toggleLikeTrack, isTrackLiked } from '@/lib/offline-storage';
import type { Track } from '@/lib/spotify';

type TabKey = 'liked' | 'recent';

export default function LibraryScreen() {
  const { colors } = useTheme();
  const { playTrack } = usePlayer();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('liked');
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [liked, recent] = await Promise.all([
        getLikedTracks(),
        getRecentlyPlayed(),
      ]);
      setLikedTracks(liked);
      setRecentTracks(recent);
      setLikedIds(new Set(liked.map((t) => t.id)));
    } catch (error) {
      console.error('Error loading library:', error);
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

  const handlePlayAll = (tracks: Track[]) => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShufflePlay = (tracks: Track[]) => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  const handleToggleLike = async (track: Track) => {
    await toggleLikeTrack(track);
    const isLiked = await isTrackLiked(track.id);
    if (isLiked) {
      setLikedIds((prev) => new Set(prev).add(track.id));
    } else {
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
      setLikedTracks((prev) => prev.filter((t) => t.id !== track.id));
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'liked', label: 'Liked', icon: <Heart size={16} color={activeTab === 'liked' ? colors.primaryForeground : colors.mutedForeground} fill={activeTab === 'liked' ? colors.primaryForeground : 'transparent'} />, count: likedTracks.length },
    { key: 'recent', label: 'Recent', icon: <Clock size={16} color={activeTab === 'recent' ? colors.primaryForeground : colors.mutedForeground} />, count: recentTracks.length },
  ];

  const currentTracks = activeTab === 'liked' ? likedTracks : recentTracks;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Your Library</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              { backgroundColor: activeTab === tab.key ? colors.primary : colors.secondary },
            ]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            {tab.icon}
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Layout.nowPlayingBarHeight + Layout.tabBarHeight + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {currentTracks.length > 0 ? (
          <>
            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.playButton, { backgroundColor: colors.primary }]}
                onPress={() => handlePlayAll(currentTracks)}
              >
                <Play size={22} color={colors.primaryForeground} fill={colors.primaryForeground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shuffleButton, { backgroundColor: colors.secondary }]}
                onPress={() => handleShufflePlay(currentTracks)}
              >
                <Shuffle size={20} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.trackCount, { color: colors.mutedForeground }]}>
                {currentTracks.length} songs
              </Text>
            </View>

            {/* Track List */}
            {currentTracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index}
                showIndex
                isLiked={likedIds.has(track.id)}
                onPress={() => playTrack(track, currentTracks)}
                onLikePress={() => handleToggleLike(track)}
              />
            ))}
          </>
        ) : (
          <EmptyState
            icon={activeTab === 'liked' ? 'heart' : 'clock'}
            title={activeTab === 'liked' ? 'No liked songs yet' : 'No recent history'}
            description={
              activeTab === 'liked'
                ? 'Songs you like will appear here. Tap the heart icon on any song.'
                : 'Start playing music and your history will show up here.'
            }
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.lg,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 12,
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
  trackCount: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
  },
});
