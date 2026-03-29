/**
 * PressableScale — Enterprise-grade press effect component
 * Provides raise-up, shadow deepening, and subtle glow on press
 * Used across all interactive surfaces in HomeBase
 */
import React, { useRef, useCallback } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  ViewStyle,
  PressableProps,
} from 'react-native';

interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Scale when pressed (default 0.97 — subtle shrink) */
  activeScale?: number;
  /** Shadow color for glow effect (default green) */
  glowColor?: string;
  /** Whether to show glow effect on press */
  showGlow?: boolean;
  /** Disable the scale animation */
  disableAnimation?: boolean;
}

export function PressableScale({
  children,
  style,
  activeScale = 0.97,
  glowColor = '#22C55E',
  showGlow = true,
  disableAnimation = false,
  ...pressableProps
}: PressableScaleProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    if (disableAnimation) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: activeScale,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [disableAnimation, activeScale]);

  const handlePressOut = useCallback(() => {
    if (disableAnimation) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 6,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [disableAnimation]);

  const animatedShadow = showGlow ? {
    shadowColor: glowColor,
    shadowOffset: {
      width: 0,
      height: shadowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 8],
      }),
    },
    shadowOpacity: shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.08, 0.25],
    }),
    shadowRadius: shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [4, 16],
    }),
    elevation: shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [2, 8],
    }),
  } : {};

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...pressableProps}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
          },
          animatedShadow,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default PressableScale;
