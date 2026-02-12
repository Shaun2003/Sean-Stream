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
import { router } from 'expo-router';
import { ChevronLeft, Music, Heart, ListMusic, Clock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/constants/layout';
import { EmptyState } from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabase';

interface ActivityItem {
  id: string;
  type: 'play' | 'like' | 'playlist_create';
  title: string;
  description: string;
  created_at: string;
}

export default function ActivityScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivity = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      // Load recent listening history and likes from Supabase
      const [historyRes, likesRes, playlistsRes] = await Promise.all([
        supabase.from('listening_history').select('*').eq('user_id', user.id).order('played_at', { ascending: false }).limit(20),
        supabase.from('liked_songs').select('*').eq('user_id', user.id).order('liked_at', { ascending: false }).limit(10),
        supabase.from('playlists').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ]);

      const items: ActivityItem[] = [];

      (historyRes.data || []).forEach((h: any) => {
        items.push({
          id: `play-${h.id}`,
          type: 'play',
          title: h.track_title || 'Unknown Track',
          description: `Played ${h.track_artist || 'Unknown Artist'}`,
          created_at: h.played_at,
        });
      });

      (likesRes.data || []).forEach((l: any) => {
        items.push({
          id: `like-${l.id}`,
          type: 'like',
          title: l.track_title || 'Unknown Track',
          description: `Liked ${l.track_artist || 'Unknown Artist'}`,
          created_at: l.liked_at,
        });
      });

      (playlistsRes.data || []).forEach((p: any) => {
        items.push({
          id: `playlist-${p.id}`,
          type: 'playlist_create',
          title: p.name,
          description: 'Created a playlist',
          created_at: p.created_at,
        });
      });

      // Sort by date
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setActivities(items.slice(0, 30));
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadActivity();
  }, [loadActivity]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'play': return <Music size={18} color="#3B82F6" />;
      case 'like': return <Heart size={18} color="#EF4444" fill="#EF4444" />;
      case 'playlist_create': return <ListMusic size={18} color={colors.primary} />;
      default: return <Clock size={18} color={colors.mutedForeground} />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Activity</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {activities.length === 0 ? (
          <EmptyState
            icon="activity"
            title="No activity yet"
            description="Your listening activity and interactions will appear here."
          />
        ) : (
          activities.map((item) => (
            <View key={item.id} style={[styles.activityItem, { borderBottomColor: colors.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
                {getIcon(item.type)}
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.activityDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.description}
                </Text>
              </View>
              <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
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
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: { flex: 1, gap: 2 },
  activityTitle: { fontSize: 15, fontWeight: '500' },
  activityDesc: { fontSize: 13 },
  activityTime: { fontSize: 12 },
});
