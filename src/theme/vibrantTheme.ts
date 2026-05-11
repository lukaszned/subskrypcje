export const vibrantTheme = {
  colors: {
    bg: '#070A12',
    bg2: '#0B1020',
    card: 'rgba(255,255,255,0.08)',
    cardStrong: 'rgba(255,255,255,0.12)',
    cardSoft: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.12)',
    borderStrong: 'rgba(255,255,255,0.2)',
    text: '#F8FAFC',
    textMuted: 'rgba(248,250,252,0.66)',
    textSubtle: 'rgba(248,250,252,0.45)',
    primary: '#20F6B5',
    cyan: '#22D3EE',
    violet: '#8B5CF6',
    pink: '#EC4899',
    danger: '#FF4D6D',
    warning: '#FBBF24',
    success: '#34D399',
    darkText: '#101827',
  },
  gradients: {
    app: ['#070A12', '#0B1020', '#101A2E'] as const,
    aurora: ['rgba(32,246,181,0.36)', 'rgba(34,211,238,0.18)', 'transparent'] as const,
    hero: ['#19E6A7', '#22D3EE', '#7C3AED'] as const,
    primary: ['#20F6B5', '#22D3EE'] as const,
    violet: ['#8B5CF6', '#EC4899'] as const,
    danger: ['#FF4D6D', '#F97316'] as const,
    glass: ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.06)'] as const,
  },
  radii: {
    xl: 24,
    xxl: 30,
  },
  shadows: {
    glow: {
      shadowColor: '#20F6B5',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.35,
      shadowRadius: 28,
      elevation: 9,
    },
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.22,
      shadowRadius: 30,
      elevation: 8,
    },
  },
} as const;

export type VibrantTheme = typeof vibrantTheme;
