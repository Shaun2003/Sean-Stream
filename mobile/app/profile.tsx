import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  LogOut,
  Heart,
  ListMusic,
  Settings,
  BarChart3,
  User,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/constants/layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
  const [stats, setStats] = useState({ likedSongs: 0, playlists: 0 });

  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const [profileRes, likedRes, playlistRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('liked_songs').select('id').eq('user_id', user.id),
        supabase.from('playlists').select('id').eq('user_id', user.id),
      ]);
      if (profileRes.data) {
        setProfile({
          display_name: profileRes.data.display_name || user.email?.split('@')[0] || 'User',
          avatar_url: profileRes.data.avatar_url,
        });
      }
      setStats({
        likedSongs: likedRes.data?.length || 0,
        playlists: playlistRes.data?.length || 0,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Avatar + Name */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={[styles.displayName, { color: colors.foreground }]}>{displayName}</Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Heart size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.likedSongs}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Liked Songs</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <ListMusic size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.playlists}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Playlists</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem
            icon={<BarChart3 size={20} color={colors.foreground} />}
            label="Listening Stats"
            onPress={() => router.push('/stats')}
            colors={colors}
          />
          <MenuItem
            icon={<Heart size={20} color={colors.foreground} />}
            label="Liked Songs"
            onPress={() => router.push('/(tabs)/library')}
            colors={colors}
          />
          <MenuItem
            icon={<ListMusic size={20} color={colors.foreground} />}
            label="Your Playlists"
            onPress={() => router.push('/(tabs)/playlists')}
            colors={colors}
          />
        </View>

        {/* Sign Out */}
        <View style={{ paddingHorizontal: Layout.spacing.lg, marginTop: 24 }}>
          <Button
            title="Sign Out"
            variant="destructive"
            onPress={handleSignOut}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={onPress}>
      {icon}
      <Text style={[styles.menuLabel, { color: colors.foreground }]}>{label}</Text>
      <ChevronLeft size={18} color={colors.mutedForeground} style={{ transform: [{ rotate: '180deg' }] }} />
    </TouchableOpacity>
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
  profileSection: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 96, height: 96 },
  avatarText: { fontSize: 36, fontWeight: '700' },
  displayName: { fontSize: 24, fontWeight: '700' },
  email: { fontSize: 14 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.lg,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: Layout.radius.lg,
    gap: 6,
  },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  menu: {
    marginHorizontal: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderBottomWidth: 0.5,
  },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
});
