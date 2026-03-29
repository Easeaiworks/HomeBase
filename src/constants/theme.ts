/**
 * HomeBase Design Tokens
 * Modern glassmorphism — frosted glass cards, layered shadows, translucent depth
 */

export const colors = {
  // Primary palette
  white: '#FFFFFF',
  background: '#F0F2F5',

  // Glass surfaces
  glass: {
    /** Primary card surface — white with subtle transparency */
    card: 'rgba(255, 255, 255, 0.82)',
    /** Elevated surface — slightly more opaque */
    elevated: 'rgba(255, 255, 255, 0.92)',
    /** Input field surface */
    input: 'rgba(255, 255, 255, 0.70)',
    /** Tab bar / header surface */
    nav: 'rgba(255, 255, 255, 0.85)',
    /** Subtle overlay for modals */
    overlay: 'rgba(0, 0, 0, 0.40)',
    /** Frosted border for glass elements */
    border: 'rgba(255, 255, 255, 0.60)',
    /** Inner glow / highlight on top edge */
    highlight: 'rgba(255, 255, 255, 0.50)',
  },

  // Green accent
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  // Blue accent
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Teal (tertiary)
  teal: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
  },

  // Neutrals
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
  /** Glass-specific: soft diffused glow */
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  /** Colored shadow for accent buttons */
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 6,
  }),
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28, letterSpacing: -0.2 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  small: { fontSize: 11, fontWeight: '500' as const, lineHeight: 16 },
} as const;
