import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, ListMusic, Trash2, Play } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/constants/layout';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  track_count: number;
  created_at: string;
}

export default function PlaylistsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadPlaylists = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPlaylists(data);
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPlaylists();
  }, [loadPlaylists]);

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    setIsCreating(true);
    try {
      const { error } = await supabase.from('playlists').insert({
        name: newName.trim(),
        description: newDescription.trim() || null,
        user_id: user.id,
        track_count: 0,
      });
      if (!error) {
        setShowCreate(false);
        setNewName('');
        setNewDescription('');
        loadPlaylists();
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Playlist', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('playlists').delete().eq('id', id);
            setPlaylists((prev) => prev.filter((p) => p.id !== id));
          } catch (error) {
            console.error('Error deleting playlist:', error);
          }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <EmptyState
          icon="list-music"
          title="Sign in to create playlists"
          description="Create an account to save and manage your playlists across devices."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Your Playlists</Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreate(true)}
        >
          <Plus size={18} color={colors.primaryForeground} />
          <Text style={[styles.createButtonText, { color: colors.primaryForeground }]}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Layout.nowPlayingBarHeight + Layout.tabBarHeight + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {playlists.length > 0 ? (
          playlists.map((playlist) => (
            <TouchableOpacity
              key={playlist.id}
              style={styles.playlistItem}
              onPress={() => router.push(`/playlist/${playlist.id}`)}
              activeOpacity={0.6}
            >
              <View style={[styles.playlistCover, { backgroundColor: colors.secondary }]}>
                {playlist.cover_url ? (
                  <Image source={{ uri: playlist.cover_url }} style={styles.playlistCoverImage} contentFit="cover" />
                ) : (
                  <ListMusic size={24} color={colors.mutedForeground} />
                )}
              </View>
              <View style={styles.playlistInfo}>
                <Text style={[styles.playlistName, { color: colors.foreground }]} numberOfLines={1}>
                  {playlist.name}
                </Text>
                <Text style={[styles.playlistMeta, { color: colors.mutedForeground }]}>
                  {playlist.track_count || 0} tracks
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(playlist.id, playlist.name)}
                hitSlop={8}
                style={styles.deleteButton}
              >
                <Trash2 size={18} color={colors.destructive} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        ) : (
          <EmptyState
            icon="list-music"
            title="No playlists yet"
            description="Create your first playlist to start organizing your music."
          />
        )}
      </ScrollView>

      {/* Create Playlist Modal */}
      <Modal visible={showCreate} onClose={() => setShowCreate(false)} title="New Playlist">
        <View style={styles.modalContent}>
          <Input
            placeholder="Playlist name"
            value={newName}
            onChangeText={setNewName}
          />
          <Input
            placeholder="Description (optional)"
            value={newDescription}
            onChangeText={setNewDescription}
            multiline
          />
          <Button
            title={isCreating ? 'Creating...' : 'Create Playlist'}
            onPress={handleCreate}
            disabled={!newName.trim() || isCreating}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 10,
    gap: 12,
  },
  playlistCover: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playlistCoverImage: {
    width: 56,
    height: 56,
  },
  playlistInfo: {
    flex: 1,
    gap: 2,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
  },
  playlistMeta: {
    fontSize: 13,
  },
  deleteButton: {
    padding: 8,
  },
  modalContent: {
    gap: 12,
    paddingTop: 8,
  },
});
