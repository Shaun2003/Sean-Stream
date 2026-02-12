import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Radio as RadioIcon, Play, Trash2, Music } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Layout } from '@/constants/layout';
import { EmptyState } from '@/components/ui/EmptyState';
import { getRecommendations, searchTracks, type Track } from '@/lib/spotify';

interface RadioStation {
  id: string;
  name: string;
  seedGenre: string;
  tracks: Track[];
  color: string;
}

const SEED_GENRES = [
  { genre: 'pop', label: 'Pop Radio', color: '#EC4899' },
  { genre: 'hip-hop', label: 'Hip-Hop Radio', color: '#F97316' },
  { genre: 'rock', label: 'Rock Radio', color: '#EF4444' },
  { genre: 'electronic', label: 'Electronic Radio', color: '#06B6D4' },
  { genre: 'r-n-b', label: 'R&B Radio', color: '#8B5CF6' },
  { genre: 'jazz', label: 'Jazz Radio', color: '#D97706' },
  { genre: 'classical', label: 'Classical Radio', color: '#64748B' },
  { genre: 'indie', label: 'Indie Radio', color: '#22C55E' },
];

export default function RadioScreen() {
  const { colors } = useTheme();
  const { playTrack } = usePlayer();
  const insets = useSafeAreaInsets();
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const handleGenerate = async (seed: typeof SEED_GENRES[0]) => {
    setGeneratingId(seed.genre);
    try {
      const tracks = await getRecommendations({ seedGenres: [seed.genre], limit: 25 });
      if (tracks.length > 0) {
        playTrack(tracks[0], tracks);
      }
    } catch (error) {
      console.error('Error generating radio:', error);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Radio</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <RadioIcon size={32} color={colors.primary} />
          <Text style={[styles.introTitle, { color: colors.foreground }]}>Radio Stations</Text>
          <Text style={[styles.introDesc, { color: colors.mutedForeground }]}>
            Tap a genre to generate a radio station with endless music recommendations.
          </Text>
        </View>

        <View style={styles.grid}>
          {SEED_GENRES.map((seed) => (
            <TouchableOpacity
              key={seed.genre}
              style={[styles.stationCard, { backgroundColor: seed.color }]}
              onPress={() => handleGenerate(seed)}
              activeOpacity={0.8}
              disabled={generatingId === seed.genre}
            >
              {generatingId === seed.genre ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
              )}
              <Text style={styles.stationLabel}>{seed.label}</Text>
              <Text style={styles.stationSub}>25 tracks</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  intro: {
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: 24,
    gap: 8,
  },
  introTitle: { fontSize: 24, fontWeight: '700' },
  introDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Layout.spacing.lg,
    gap: 12,
  },
  stationCard: {
    width: '47%',
    padding: 20,
    borderRadius: Layout.radius.lg,
    gap: 10,
    minHeight: 120,
    justifyContent: 'center',
  },
  stationLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  stationSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
});
