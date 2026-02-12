import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Users, UserMinus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/constants/layout';
import { EmptyState } from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabase';

interface FollowedUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export default function FollowingScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [following, setFollowing] = useState<FollowedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFollowing = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('follows')
        .select('followed_id, profiles!follows_followed_id_fkey(id, display_name, avatar_url)')
        .eq('follower_id', user.id);

      if (data) {
        setFollowing(
          data
            .filter((f: any) => f.profiles)
            .map((f: any) => ({
              id: f.profiles.id,
              display_name: f.profiles.display_name || 'User',
              avatar_url: f.profiles.avatar_url,
            }))
        );
      }
    } catch (error) {
      console.error('Error loading following:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFollowing();
  }, [loadFollowing]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Following</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {following.length === 0 ? (
          <EmptyState
            icon="users"
            title="Not following anyone"
            description="Follow other users to see their activity and playlists."
          />
        ) : (
          following.map((u) => (
            <View key={u.id} style={[styles.userItem, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                {u.avatar_url ? (
                  <Image source={{ uri: u.avatar_url }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                    {u.display_name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
                {u.display_name}
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
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: 0.5,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 48, height: 48 },
  avatarText: { fontSize: 18, fontWeight: '700' },
  userName: { flex: 1, fontSize: 16, fontWeight: '500' },
});
