import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Heart, MoreVertical, Play } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Layout } from '@/constants/layout';
import type { Track } from '@/lib/spotify';

interface TrackRowProps {
  track: Track;
  index?: number;
  showIndex?: boolean;
  isPlaying?: boolean;
  isLiked?: boolean;
  onPress?: () => void;
  onLikePress?: () => void;
  onMorePress?: () => void;
}

export function TrackRow({
  track,
  index,
  showIndex = false,
  isPlaying = false,
  isLiked = false,
  onPress,
  onLikePress,
  onMorePress,
}: TrackRowProps) {
  const { colors } = useTheme();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {showIndex && index !== undefined && (
        <Text style={[styles.index, { color: colors.mutedForeground }]}>
          {index + 1}
        </Text>
      )}

      <View style={styles.artworkWrapper}>
        <Image
          source={{ uri: track.coverUrl }}
          style={styles.artwork}
          contentFit="cover"
          transition={200}
        />
        {isPlaying && (
          <View style={[styles.playingOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <Play size={16} color={colors.primary} fill={colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text
          style={[
            styles.title,
            { color: isPlaying ? colors.primary : colors.foreground },
          ]}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <Text style={[styles.artist, { color: colors.mutedForeground }]} numberOfLines={1}>
          {track.artist}
          {track.duration > 0 && ` \u00B7 ${formatDuration(track.duration)}`}
        </Text>
      </View>

      <View style={styles.actions}>
        {onLikePress && (
          <TouchableOpacity onPress={onLikePress} hitSlop={8} style={styles.actionButton}>
            <Heart
              size={18}
              color={isLiked ? colors.primary : colors.mutedForeground}
              fill={isLiked ? colors.primary : 'transparent'}
            />
          </TouchableOpacity>
        )}
        {onMorePress && (
          <TouchableOpacity onPress={onMorePress} hitSlop={8} style={styles.actionButton}>
            <MoreVertical size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: Layout.spacing.lg,
    gap: 12,
  },
  index: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '500',
    width: 24,
    textAlign: 'center',
  },
  artworkWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: Layout.radius.sm,
    overflow: 'hidden',
  },
  artwork: {
    width: 48,
    height: 48,
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: Layout.fontSize.base,
    fontWeight: '500',
  },
  artist: {
    fontSize: Layout.fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 8,
  },
});
