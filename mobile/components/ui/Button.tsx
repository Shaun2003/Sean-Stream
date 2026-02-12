import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Layout } from '@/constants/layout';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();

  const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.secondary },
    ghost: { backgroundColor: 'transparent' },
    destructive: { backgroundColor: colors.destructive },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  };

  const variantTextStyles: Record<string, TextStyle> = {
    primary: { color: colors.primaryForeground },
    secondary: { color: colors.secondaryForeground },
    ghost: { color: colors.foreground },
    destructive: { color: colors.destructiveForeground },
    outline: { color: colors.foreground },
  };

  const sizeStyles: Record<string, ViewStyle> = {
    sm: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Layout.radius.sm },
    md: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Layout.radius.md },
    lg: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: Layout.radius.lg },
    icon: { width: 40, height: 40, borderRadius: Layout.radius.full, padding: 0, alignItems: 'center', justifyContent: 'center' },
  };

  const sizeTextStyles: Record<string, TextStyle> = {
    sm: { fontSize: Layout.fontSize.sm },
    md: { fontSize: Layout.fontSize.base },
    lg: { fontSize: Layout.fontSize.lg },
    icon: { fontSize: Layout.fontSize.base },
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && styles.disabled,
        style as ViewStyle,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantTextStyles[variant].color as string}
        />
      ) : typeof children === 'string' ? (
        <Text
          style={[styles.text, variantTextStyles[variant], sizeTextStyles[size]]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
