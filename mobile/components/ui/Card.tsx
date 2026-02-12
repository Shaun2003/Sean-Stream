import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Layout } from '@/constants/layout';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated';
}

export function Card({ children, style, onPress, variant = 'default' }: CardProps) {
  const { colors } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: Layout.radius.lg,
    ...(variant === 'default' ? { borderWidth: 1, borderColor: colors.border } : {}),
    ...(variant === 'elevated'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 4,
        }
      : {}),
  };

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[cardStyle, styles.card, style]}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, styles.card, style]}>{children}</View>;
}

export function CardHeader({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export function CardContent({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.content, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  header: {
    padding: Layout.spacing.lg,
    gap: 4,
  },
  content: {
    padding: Layout.spacing.lg,
    paddingTop: 0,
  },
});
