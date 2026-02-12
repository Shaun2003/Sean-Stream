import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Sparkles, Play, Music } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Layout } from '@/constants/layout';
import { getRecommendations, searchTracks, type Track } from '@/lib/spotify';

const MOODS = [
  { id: 'chill', name: 'Chill', emoji: 'Chill vibes', color: '#3B82F6', gradientEnd: '#06B6D4', query: 'chill relaxing music', genres: ['chill'] },
  { id: 'workout', name: 'Workout', emoji: 'High energy', color: '#EF4444', gradientEnd: '#F97316', query: 'workout motivation music', genres: ['work-out'] },
  { id: 'focus', name: 'Focus', emoji: 'Deep focus', color: '#8B5CF6', gradientEnd: '#6366F1', query: 'focus concentration music', genres: ['study'] },
  { id: 'party', name: 'Party', emoji: 'Party time', color: '#EC4899', gradientEnd: '#8B5CF6', query: 'party dance music', genres: ['party'] },
  { id: 'romantic', name: 'Romantic', emoji: 'Love songs', color: '#F43F5E', gradientEnd: '#EC4899', query: 'romantic love songs', genres: ['romance'] },
  { id: 'sad', name: 'Sad', emoji: 'In the feels', color: '#64748B', gradientEnd: '#3B82F6', query: 'sad emotional music', genres: ['sad'] },
  { id: 'happy', name: 'Happy', emoji: 'Good vibes', color: '#F59E0B', gradientEnd: '#F97316', query: 'happy upbeat music', genres: ['happy'] },
];

export default function MoodsScreen() {
  const { colors } = useTheme();
  const { playTrack } = usePlayer();
  const insets = useSafeAreaInsets();
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const handleMoodPress = async (mood: typeof MOODS[0]) => {
    setGeneratingId(mood.id);
    try {
      // Try recommendations first, fall back to search
      let tracks: Track[] = [];
      try {
        tracks = await getRecommendations({ seedGenres: mood.genres, limit: 25 });
      } catch {
        tracks = await searchTracks(mood.query, 25);
      }
      if (tracks.length > 0) {
        playTrack(tracks[0], tracks);
      }
    } catch (error) {
      console.error('Error generating mood playlist:', error);
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Moods</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Sparkles size={32} color={colors.primary} />
          <Text style={[styles.introTitle, { color: colors.foreground }]}>Mood Playlists</Text>
          <Text style={[styles.introDesc, { color: colors.mutedForeground }]}>
            Pick your mood and get an instant playlist tailored to how you feel.
          </Text>
        </View>

        <View style={styles.grid}>
          {MOODS.map((mood) => (
            <TouchableOpacity
              key={mood.id}
              style={[styles.moodCard, { backgroundColor: mood.color }]}
              onPress={() => handleMoodPress(mood)}
              activeOpacity={0.8}
              disabled={generatingId === mood.id}
            >
              {generatingId === mood.id ? (
                <ActivityIndicator color="#FFFFFF" size="large" />
              ) : (
                <>
                  <Text style={styles.moodName}>{mood.name}</Text>
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <View style={styles.moodFooter}>
                    <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.moodCount}>25 tracks</Text>
                  </View>
                </>
              )}
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
  moodCard: {
    width: '47%',
    padding: 20,
    borderRadius: Layout.radius.lg,
    gap: 8,
    minHeight: 140,
    justifyContent: 'center',
  },
  moodName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  moodEmoji: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  moodFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  moodCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
});
