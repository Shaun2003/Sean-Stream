import React, { useCallback } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';

interface SliderProps {
  value: number;
  minimumValue?: number;
  maximumValue?: number;
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  disabled?: boolean;
  trackHeight?: number;
}

export function Slider({
  value,
  minimumValue = 0,
  maximumValue = 1,
  onValueChange,
  onSlidingComplete,
  disabled = false,
  trackHeight = 4,
}: SliderProps) {
  const { colors } = useTheme();
  const trackWidth = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const progress = Math.max(0, Math.min(1, (value - minimumValue) / (maximumValue - minimumValue)));

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      trackWidth.value = e.nativeEvent.layout.width;
    },
    [trackWidth]
  );

  const calculateValue = useCallback(
    (x: number) => {
      'worklet';
      const clamped = Math.max(0, Math.min(x, trackWidth.value));
      const ratio = clamped / trackWidth.value;
      return minimumValue + ratio * (maximumValue - minimumValue);
    },
    [minimumValue, maximumValue, trackWidth]
  );

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onBegin((e) => {
      isDragging.value = true;
      if (onValueChange) {
        const val = calculateValue(e.x);
        runOnJS(onValueChange)(val);
      }
    })
    .onUpdate((e) => {
      if (onValueChange) {
        const val = calculateValue(e.x);
        runOnJS(onValueChange)(val);
      }
    })
    .onEnd((e) => {
      isDragging.value = false;
      if (onSlidingComplete) {
        const val = calculateValue(e.x);
        runOnJS(onSlidingComplete)(val);
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onEnd((e) => {
      if (onValueChange) {
        const val = calculateValue(e.x);
        runOnJS(onValueChange)(val);
      }
      if (onSlidingComplete) {
        const val = calculateValue(e.x);
        runOnJS(onSlidingComplete)(val);
      }
    });

  const gesture = Gesture.Race(panGesture, tapGesture);

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.container, { opacity: disabled ? 0.5 : 1 }]} onLayout={onLayout}>
        <View style={[styles.track, { height: trackHeight, backgroundColor: colors.secondary }]}>
          <Animated.View
            style={[
              styles.fill,
              {
                height: trackHeight,
                backgroundColor: colors.primary,
                width: `${progress * 100}%`,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            {
              left: `${progress * 100}%`,
              backgroundColor: colors.foreground,
              marginLeft: -8,
            },
          ]}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 30,
    justifyContent: 'center',
  },
  track: {
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
