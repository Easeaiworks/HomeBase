import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, borderRadius, typography, shadows } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[`${variant}Bg` as keyof typeof styles] as ViewStyle,
        styles[`${size}Size` as keyof typeof styles] as ViewStyle,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'secondary' ? colors.white : colors.green[600]}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              styles[`${variant}Text` as keyof typeof styles] as TextStyle,
              styles[`${size}Text` as keyof typeof styles] as TextStyle,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: 8,
    borderRadius: borderRadius.lg,
    minHeight: 48,
  },
  // Variant backgrounds
  primaryBg: {
    backgroundColor: colors.green[500],
    ...shadows.md,
    shadowColor: colors.green[600],
    shadowOpacity: 0.25,
  },
  secondaryBg: {
    backgroundColor: colors.blue[500],
    ...shadows.md,
    shadowColor: colors.blue[600],
    shadowOpacity: 0.25,
  },
  outlineBg: {
    backgroundColor: colors.glass.card,
    borderWidth: 1.5,
    borderColor: colors.green[400],
    ...shadows.sm,
  },
  ghostBg: {
    backgroundColor: 'transparent',
  },
  // Sizes — all meet 44pt minimum touch target
  smSize: { paddingHorizontal: 16, paddingVertical: 10, minHeight: 44 },
  mdSize: { paddingHorizontal: 22, paddingVertical: 14, minHeight: 48 },
  lgSize: { paddingHorizontal: 28, paddingVertical: 18, minHeight: 56 },
  // Text
  text: {
    fontWeight: '600',
  },
  primaryText: { color: colors.white, fontSize: 15 },
  secondaryText: { color: colors.white, fontSize: 15 },
  outlineText: { color: colors.green[600], fontSize: 15 },
  ghostText: { color: colors.green[600], fontSize: 15 },
  smText: { fontSize: 13 },
  mdText: { fontSize: 15 },
  lgText: { fontSize: 17 },
  // States
  disabled: { opacity: 0.5 },
});
