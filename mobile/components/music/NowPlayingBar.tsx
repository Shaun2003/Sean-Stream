import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Play, Pause, SkipForward, Heart } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Layout } from '@/constants/layout';

export function NowPlayingBar() {
  const { colors } = useTheme();
  const { currentTrack, isPlaying, isLoading, pause, resume, skipNext, progress, duration } = usePlayer();

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.nowPlayingBar, borderTopColor: colors.border }]}
      onPress={() => router.push('/player')}
      activeOpacity={0.9}
    >
      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progressPercent}%` }]} />
      </View>

      <View style={styles.content}>
        <Image
          source={{ uri: currentTrack.coverUrl }}
          style={styles.artwork}
          contentFit="cover"
          transition={200}
        />

        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={[styles.artist, { color: colors.mutedForeground }]} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={isPlaying ? pause : resume}
            hitSlop={8}
            style={styles.controlButton}
          >
            {isPlaying ? (
              <Pause size={22} color={colors.foreground} fill={colors.foreground} />
            ) : (
              <Play size={22} color={colors.foreground} fill={colors.foreground} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={skipNext} hitSlop={8} style={styles.controlButton}>
            <SkipForward size={20} color={colors.foreground} fill={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 0.5,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 2,
    width: '100%',
  },
  progressFill: {
    height: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: 8,
    gap: 10,
    height: Layout.nowPlayingBarHeight - 2,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: Layout.radius.sm,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  artist: {
    fontSize: Layout.fontSize.xs,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlButton: {
    padding: 8,
  },
});
