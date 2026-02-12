import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Clock,
  Music,
  Disc3,
  Flame,
  Trophy,
  Award,
  Star,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Layout } from '@/constants/layout';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { getListeningStats, getTopTracks, getTopArtists } from '@/lib/offline-storage';

interface StatsData {
  totalListeningTime: number;
  totalTracks: number;
  totalArtists: number;
  topTracks: { title: string; artist: string; playCount: number }[];
  topArtists: { name: string; playCount: number }[];
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [listeningStats, topTracksData, topArtistsData] = await Promise.all([
        getListeningStats(),
        getTopTracks(10),
        getTopArtists(5),
      ]);
      setStats({
        ...listeningStats,
        topTracks: topTracksData,
        topArtists: topArtistsData,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Your Stats</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {!stats || stats.totalTracks === 0 ? (
          <EmptyState
            icon="bar-chart"
            title="No stats yet"
            description="Start listening to music to build your stats and unlock achievements."
          />
        ) : (
          <>
            {/* Quick Stats */}
            <View style={styles.statsGrid}>
              <StatCard icon={<Clock size={20} color="#3B82F6" />} label="Total Listening" value={formatTime(stats.totalListeningTime)} bgColor="rgba(59,130,246,0.1)" colors={colors} />
              <StatCard icon={<Music size={20} color={colors.primary} />} label="Tracks Played" value={String(stats.totalTracks)} bgColor={`${colors.primary}20`} colors={colors} />
              <StatCard icon={<Disc3 size={20} color="#F97316" />} label="Artists" value={String(stats.totalArtists)} bgColor="rgba(249,115,22,0.1)" colors={colors} />
              <StatCard icon={<Flame size={20} color="#EF4444" />} label="Top Genre" value="Mixed" bgColor="rgba(239,68,68,0.1)" colors={colors} />
            </View>

            {/* Top Tracks */}
            {stats.topTracks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Star size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Most Played Tracks</Text>
                </View>
                {stats.topTracks.map((track, i) => (
                  <View key={track.title + i} style={[styles.trackItem, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.trackIndex, { color: colors.mutedForeground }]}>{i + 1}</Text>
                    <View style={styles.trackInfo}>
                      <Text style={[styles.trackTitle, { color: colors.foreground }]} numberOfLines={1}>{track.title}</Text>
                      <Text style={[styles.trackArtist, { color: colors.mutedForeground }]} numberOfLines={1}>{track.artist}</Text>
                    </View>
                    <Text style={[styles.trackPlays, { color: colors.primary }]}>{track.playCount} plays</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Top Artists */}
            {stats.topArtists.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <TrendingUp size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Artists</Text>
                </View>
                {stats.topArtists.map((artist, i) => {
                  const barWidth = stats.topArtists.length > 0
                    ? (artist.playCount / stats.topArtists[0].playCount) * 100
                    : 0;
                  return (
                    <View key={artist.name + i} style={styles.artistItem}>
                      <View style={styles.artistInfo}>
                        <Text style={[styles.artistIndex, { color: colors.mutedForeground }]}>{i + 1}</Text>
                        <Text style={[styles.artistName, { color: colors.foreground }]} numberOfLines={1}>{artist.name}</Text>
                        <Text style={[styles.artistPlays, { color: colors.mutedForeground }]}>{artist.playCount}</Text>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: colors.secondary }]}>
                        <View style={[styles.barFill, { backgroundColor: colors.primary, width: `${barWidth}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  bgColor,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
  colors: any;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statIcon, { backgroundColor: bgColor }]}>{icon}</View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { flex: 1 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Layout.spacing.lg,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    padding: 14,
    borderRadius: Layout.radius.lg,
    gap: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  section: { marginBottom: 28, paddingHorizontal: Layout.spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  trackIndex: { width: 24, textAlign: 'center', fontSize: 14, fontWeight: '700' },
  trackInfo: { flex: 1, gap: 2 },
  trackTitle: { fontSize: 15, fontWeight: '500' },
  trackArtist: { fontSize: 12 },
  trackPlays: { fontSize: 13, fontWeight: '600' },
  artistItem: { marginBottom: 14, gap: 6 },
  artistInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  artistIndex: { width: 20, fontSize: 14, fontWeight: '700' },
  artistName: { flex: 1, fontSize: 15, fontWeight: '500' },
  artistPlays: { fontSize: 13 },
  barTrack: { height: 6, borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },
});
