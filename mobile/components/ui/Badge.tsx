import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Layout } from '@/constants/layout';

interface BadgeProps {
  children: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  style?: ViewStyle;
}

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  const { colors } = useTheme();

  const variantStyles: Record<string, ViewStyle> = {
    default: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.secondary },
    destructive: { backgroundColor: colors.destructive },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  };

  const textColor: Record<string, string> = {
    default: colors.primaryForeground,
    secondary: colors.secondaryForeground,
    destructive: colors.destructiveForeground,
    outline: colors.foreground,
  };

  return (
    <View style={[styles.badge, variantStyles[variant], style]}>
      <Text style={[styles.text, { color: textColor[variant] }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Layout.radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
  },
});
