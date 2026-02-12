import React, { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import YoutubeIframe from 'react-native-youtube-iframe';
import { usePlayer } from '@/contexts/PlayerContext';

/**
 * Hidden YouTube player that handles audio playback via react-native-youtube-iframe.
 * This component is rendered off-screen and controlled by PlayerContext.
 */
export function YouTubePlayerEngine() {
  const {
    youtubeVideoId,
    isPlaying,
    setIsPlaying,
    setProgress,
    setDuration,
    onTrackEnd,
    seekTo,
    progress,
  } = usePlayer();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef = useRef<any>(null);
  const seekRef = useRef<number | null>(null);

  // Track progress via polling
  useEffect(() => {
    if (isPlaying && youtubeVideoId) {
      intervalRef.current = setInterval(async () => {
        try {
          const currentTime = await playerRef.current?.getCurrentTime();
          if (currentTime !== undefined && currentTime !== null) {
            setProgress(currentTime);
          }
        } catch {}
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, youtubeVideoId, setProgress]);

  const onStateChange = useCallback(
    (state: string) => {
      if (state === 'ended') {
        onTrackEnd();
      } else if (state === 'playing') {
        setIsPlaying(true);
      } else if (state === 'paused') {
        setIsPlaying(false);
      }
    },
    [onTrackEnd, setIsPlaying]
  );

  const onReady = useCallback(async () => {
    try {
      const dur = await playerRef.current?.getDuration();
      if (dur) {
        setDuration(dur);
      }
    } catch {}
  }, [setDuration]);

  if (!youtubeVideoId) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <YoutubeIframe
        ref={playerRef}
        videoId={youtubeVideoId}
        height={1}
        width={1}
        play={isPlaying}
        onChangeState={onStateChange}
        onReady={onReady}
        initialPlayerParams={{
          preventFullScreen: true,
          controls: false,
        }}
        webViewProps={{
          androidLayerType: 'hardware',
          mediaPlaybackRequiresUserAction: false,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
});
