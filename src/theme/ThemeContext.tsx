import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ColorValue } from 'react-native';
import { vibrantTheme } from './vibrantTheme';

export type ThemeName = 'default' | 'yellow' | 'red' | 'monochrome';

type ThemeColors = Record<keyof typeof vibrantTheme.colors, string>;
type ThemeGradient = readonly [string, string, ...string[]];
type ThemeGradients = Record<keyof typeof vibrantTheme.gradients, ThemeGradient>;
type ThemeShadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export type AppTheme = {
  name: ThemeName;
  label: string;
  swatch: ColorValue;
  cardBg: string;
  background: string;
  textSecondary: string;
  colors: ThemeColors;
  gradients: ThemeGradients;
  radii: typeof vibrantTheme.radii;
  shadows: {
    glow: ThemeShadow;
    card: ThemeShadow;
  };
};

const makeTheme = (
  name: ThemeName,
  label: string,
  primary: string,
  accent: string,
  heroEnd: string,
  swatch: ColorValue,
  overrides: Partial<ThemeColors> = {}
): AppTheme => ({
  ...vibrantTheme,
  name,
  label,
  swatch,
  cardBg: vibrantTheme.colors.card,
  background: vibrantTheme.colors.bg,
  textSecondary: vibrantTheme.colors.textMuted,
  colors: {
    ...(vibrantTheme.colors as ThemeColors),
    ...overrides,
    primary,
    cyan: accent,
  } as ThemeColors,
  gradients: {
    ...(vibrantTheme.gradients as ThemeGradients),
    app: [vibrantTheme.colors.bg, vibrantTheme.colors.bg2, heroEnd] as const,
    aurora: [`${primary}55`, `${accent}2E`, 'transparent'] as const,
    hero: [primary, accent, heroEnd] as const,
    primary: [primary, accent] as const,
  } as ThemeGradients,
  shadows: {
    ...vibrantTheme.shadows,
    glow: {
      ...vibrantTheme.shadows.glow,
      shadowColor: primary,
    },
  },
});

export const APP_THEMES: Record<ThemeName, AppTheme> = {
  default: makeTheme('default', 'Emerald', '#20F6B5', '#22D3EE', '#7C3AED', '#20F6B5'),
  yellow: makeTheme('yellow', 'Gold', '#FBBF24', '#F97316', '#7C2D12', '#FBBF24', {
    success: '#FBBF24',
    darkText: '#17120A',
  }),
  red: makeTheme('red', 'Ruby', '#FF4D6D', '#F43F5E', '#7F1D1D', '#FF4D6D', {
    success: '#FB7185',
    danger: '#FF4D6D',
    darkText: '#190A10',
  }),
  monochrome: makeTheme('monochrome', 'Mono', '#F8FAFC', '#CBD5E1', '#111827', '#F8FAFC', {
    bg: '#050505',
    bg2: '#0B0B0C',
    card: 'rgba(255,255,255,0.075)',
    cardStrong: 'rgba(255,255,255,0.13)',
    border: 'rgba(255,255,255,0.16)',
    borderStrong: 'rgba(255,255,255,0.26)',
    success: '#E5E7EB',
    warning: '#D1D5DB',
    danger: '#FFFFFF',
    darkText: '#050505',
  }),
};

type ThemeContextValue = {
  theme: AppTheme;
  themeName: ThemeName;
  setThemeName: (nextTheme: ThemeName) => void;
  themes: Record<ThemeName, AppTheme>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_STORAGE_KEY = 'sub_sentry_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('default');
  const updateThemeName = (nextTheme: ThemeName) => {
    setThemeName(nextTheme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme).catch(() => undefined);
  };

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedTheme) => {
        if (!isMounted) return;
        if (storedTheme && storedTheme in APP_THEMES) {
          setThemeName(storedTheme as ThemeName);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      theme: APP_THEMES[themeName],
      themeName,
      setThemeName: updateThemeName,
      themes: APP_THEMES,
    }),
    [themeName]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return value;
}
