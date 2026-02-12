import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Layout } from '@/constants/layout';
import type { Track } from '@/lib/spotify';

interface TrackCardProps {
  track: Track;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function TrackCard({ track, onPress, size = 'md' }: TrackCardProps) {
  const { colors } = useTheme();

  const dimensions = {
    sm: { width: 120, imageSize: 120 },
    md: { width: 150, imageSize: 150 },
    lg: { width: 180, imageSize: 180 },
  }[size];

  return (
    <TouchableOpacity
      style={[styles.container, { width: dimensions.width }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.imageWrapper, { width: dimensions.imageSize, height: dimensions.imageSize }]}>
        <Image
          source={{ uri: track.coverUrl }}
          style={[styles.image, { width: dimensions.imageSize, height: dimensions.imageSize }]}
          contentFit="cover"
          transition={200}
        />
        <View style={[styles.playOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
          <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
            <Play size={14} color={colors.primaryForeground} fill={colors.primaryForeground} />
          </View>
        </View>
      </View>
      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
        {track.title}
      </Text>
      <Text style={[styles.artist, { color: colors.mutedForeground }]} numberOfLines={1}>
        {track.artist}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  imageWrapper: {
    borderRadius: Layout.radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    borderRadius: Layout.radius.md,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 8,
    opacity: 0,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '500',
    paddingHorizontal: 2,
  },
  artist: {
    fontSize: Layout.fontSize.xs,
    paddingHorizontal: 2,
  },
});
