import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { colors, borderRadius, shadows } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.glass.card,
    borderRadius: borderRadius.xl,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  default: {
    ...shadows.glass,
  },
  elevated: {
    backgroundColor: colors.glass.elevated,
    ...shadows.lg,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  outlined: {
    backgroundColor: colors.glass.card,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
});
