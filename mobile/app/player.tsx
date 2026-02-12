import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronDown,
  Heart,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Share2,
  MoreVertical,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Slider } from '@/components/ui/Slider';
import { Layout } from '@/constants/layout';
import { isTrackLiked, toggleLikeTrack } from '@/lib/offline-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = SCREEN_WIDTH - 80;

export default function PlayerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    currentTrack,
    isPlaying,
    isLoading,
    progress,
    duration,
    shuffle,
    repeat,
    queue,
    pause,
    resume,
    skipNext,
    skipPrevious,
    seekTo,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();
  const [liked, setLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  // Check if track is liked
  React.useEffect(() => {
    if (currentTrack) {
      isTrackLiked(currentTrack.id).then(setLiked);
    }
  }, [currentTrack]);

  const handleLikeToggle = async () => {
    if (!currentTrack) return;
    await toggleLikeTrack(currentTrack);
    setLiked(!liked);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <ChevronDown size={28} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No track playing</Text>
        </View>
      </View>
    );
  }

  const repeatIcon =
    repeat === 'one' ? (
      <Repeat1 size={22} color={colors.primary} />
    ) : (
      <Repeat size={22} color={repeat === 'all' ? colors.primary : colors.mutedForeground} />
    );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronDown size={28} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerLabel, { color: colors.mutedForeground }]}>PLAYING FROM</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {currentTrack.album || 'Search'}
          </Text>
        </View>
        <TouchableOpacity hitSlop={12}>
          <MoreVertical size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Artwork */}
        <View style={styles.artworkContainer}>
          <Image
            source={{ uri: currentTrack.coverUrl }}
            style={[styles.artwork, { width: ARTWORK_SIZE, height: ARTWORK_SIZE }]}
            contentFit="cover"
            transition={300}
          />
        </View>

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <View style={styles.trackInfoLeft}>
            <Text style={[styles.trackTitle, { color: colors.foreground }]} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={[styles.trackArtist, { color: colors.mutedForeground }]} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLikeToggle} hitSlop={12}>
            <Heart
              size={24}
              color={liked ? colors.primary : colors.mutedForeground}
              fill={liked ? colors.primary : 'transparent'}
            />
          </TouchableOpacity>
        </View>

        {/* Progress Slider */}
        <View style={styles.progressSection}>
          <Slider
            value={progress}
            minimumValue={0}
            maximumValue={duration || 1}
            onValueChange={seekTo}
            trackColor={colors.secondary}
            fillColor={colors.primary}
            thumbColor={colors.foreground}
          />
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
              {formatTime(progress)}
            </Text>
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
              {formatTime(duration)}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={toggleShuffle} hitSlop={12}>
            <Shuffle size={22} color={shuffle ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity onPress={skipPrevious} hitSlop={12}>
            <SkipBack size={28} color={colors.foreground} fill={colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={isPlaying ? pause : resume}
            style={[styles.mainControl, { backgroundColor: colors.foreground }]}
          >
            {isPlaying ? (
              <Pause size={30} color={colors.background} fill={colors.background} />
            ) : (
              <Play size={30} color={colors.background} fill={colors.background} style={{ marginLeft: 3 }} />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={skipNext} hitSlop={12}>
            <SkipForward size={28} color={colors.foreground} fill={colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleRepeat} hitSlop={12}>
            {repeatIcon}
          </TouchableOpacity>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.bottomAction}>
            <Share2 size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomAction} onPress={() => setShowQueue(!showQueue)}>
            <ListMusic size={20} color={showQueue ? colors.primary : colors.mutedForeground} />
            {queue.length > 0 && (
              <View style={[styles.queueBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.queueBadgeText, { color: colors.primaryForeground }]}>
                  {queue.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Queue */}
        {showQueue && queue.length > 0 && (
          <View style={[styles.queueSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.queueTitle, { color: colors.foreground }]}>
              Next in Queue
            </Text>
            {queue.slice(0, 10).map((track, idx) => (
              <View key={track.id + idx} style={styles.queueItem}>
                <Image source={{ uri: track.coverUrl }} style={styles.queueArtwork} contentFit="cover" />
                <View style={styles.queueInfo}>
                  <Text style={[styles.queueTrackTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {track.title}
                  </Text>
                  <Text style={[styles.queueTrackArtist, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {track.artist}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    padding: Layout.spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: Layout.spacing.xl,
    paddingBottom: 40,
  },
  artworkContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  artwork: {
    borderRadius: Layout.radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  trackInfoLeft: {
    flex: 1,
    marginRight: 12,
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  trackArtist: {
    fontSize: 16,
    marginTop: 4,
  },
  progressSection: {
    marginBottom: 20,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 28,
  },
  mainControl: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 16,
  },
  bottomAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  queueBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    paddingHorizontal: 4,
  },
  queueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  queueSection: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  queueArtwork: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  queueInfo: {
    flex: 1,
    gap: 2,
  },
  queueTrackTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  queueTrackArtist: {
    fontSize: 12,
  },
});
