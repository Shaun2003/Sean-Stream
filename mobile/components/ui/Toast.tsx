import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { Layout } from '@/constants/layout';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  show: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [toast, setToast] = useState<Toast | null>(null);
  const translateY = useSharedValue(-100);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const hide = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 300 }, () => {
      runOnJS(setToast)(null);
    });
  }, [translateY]);

  const show = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const id = Date.now().toString();
      setToast({ id, message, type });
      translateY.value = -100;
      translateY.value = withTiming(0, { duration: 300 });
      timeoutRef.current = setTimeout(() => hide(), 3000);
    },
    [translateY, hide]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const bgColor =
    toast?.type === 'success'
      ? colors.primary
      : toast?.type === 'error'
      ? colors.destructive
      : colors.secondary;

  const textColor =
    toast?.type === 'success'
      ? colors.primaryForeground
      : toast?.type === 'error'
      ? colors.destructiveForeground
      : colors.foreground;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: bgColor },
            animatedStyle,
          ]}
        >
          <Text style={[styles.text, { color: textColor }]}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Layout.radius.lg,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
});
