import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { LOCAL_SUBSCRIPTION_PLANS } from '../data/subscriptionPlans';
import { vibrantTheme } from '../theme/vibrantTheme';

type BrandLogoMatch = {
  name: string;
  color: string;
  logoUrl?: string;
};

type BrandLogoProps = {
  name?: string | null;
  provider?: string | null;
  logoUrl?: string | null;
  color?: string | null;
  logoColor?: string | null;
  fallbackColor?: string | null;
  size?: number;
  iconSize?: number;
  containerStyle?: StyleProp<ViewStyle>;
  fallbackTextStyle?: StyleProp<TextStyle>;
  muted?: boolean;
};

const BRAND_ALIASES: Record<string, string[]> = {
  Netflix: ['netflix'],
  Spotify: ['spotify'],
  'YouTube Premium': ['youtube premium', 'youtube', 'yt premium'],
  'Disney+': ['disney+', 'disney plus', 'disney'],
  Max: ['max', 'hbo max', 'hbomax'],
  'Amazon Prime': ['amazon prime', 'prime video', 'prime'],
  'Apple Music': ['apple music'],
  'Apple TV+': ['apple tv+', 'apple tv'],
  Canva: ['canva'],
  'Xbox Game Pass': ['xbox game pass', 'game pass', 'xbox'],
  'Allegro Smart!': ['allegro smart', 'allegro'],
  Strava: ['strava'],
  'iCloud+': ['icloud+', 'icloud'],
  'ChatGPT Plus': ['chatgpt plus', 'chatgpt', 'openai'],
  'PlayStation Plus': ['playstation plus', 'ps plus', 'playstation'],
};

function normalizeBrandValue(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getBrandLogoMatch(name?: string | null, provider?: string | null): BrandLogoMatch | null {
  const source = normalizeBrandValue(`${name || ''} ${provider || ''}`);
  if (!source) return null;

  for (const plan of LOCAL_SUBSCRIPTION_PLANS) {
    const aliases = BRAND_ALIASES[plan.name] || [plan.name, plan.provider];
    if (aliases.some((alias) => source.includes(normalizeBrandValue(alias)))) {
      return {
        name: plan.name,
        color: plan.color,
        logoUrl: plan.logoUrl,
      };
    }
  }

  return null;
}

function getFallbackLabel(name?: string | null, provider?: string | null) {
  const source = String(name || provider || '?').trim();
  if (!source) return '?';

  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words[0].length <= 4) {
    return words.slice(0, 2).map((word) => word.charAt(0)).join('').toUpperCase();
  }

  return source.charAt(0).toUpperCase();
}

const BrandLogoComponent = ({
  name,
  provider,
  logoUrl,
  color,
  logoColor,
  fallbackColor,
  size = 42,
  iconSize,
  containerStyle,
  fallbackTextStyle,
  muted = false,
}: BrandLogoProps) => {
  const match = useMemo(() => getBrandLogoMatch(name, provider), [name, provider]);
  const resolvedLogoUrl = logoUrl || match?.logoUrl || null;
  const resolvedLogoColor = logoColor || color || match?.color || vibrantTheme.colors.primary;
  const resolvedFallbackColor = fallbackColor || color || match?.color || vibrantTheme.colors.primary;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const shouldRenderLogo = Boolean(resolvedLogoUrl && failedUrl !== resolvedLogoUrl);
  const computedIconSize = iconSize ?? Math.round(size * 0.58);

  useEffect(() => {
    setFailedUrl(null);
  }, [resolvedLogoUrl]);

  return (
    <View
      style={[
        styles.container,
        containerStyle,
        {
          width: size,
          height: size,
          borderRadius: Math.max(8, Math.round(size * 0.26)),
          backgroundColor: shouldRenderLogo ? '#FFFFFF' : `${resolvedFallbackColor}24`,
          opacity: muted ? 0.62 : 1,
        },
      ]}
    >
      {shouldRenderLogo ? (
        <SvgUri
          uri={resolvedLogoUrl!}
          width={computedIconSize}
          height={computedIconSize}
          fill={resolvedLogoColor}
          onError={() => setFailedUrl(resolvedLogoUrl)}
        />
      ) : (
        <Text style={[styles.fallbackText, { color: resolvedFallbackColor, fontSize: Math.max(11, Math.round(size * 0.4)) }, fallbackTextStyle]}>
          {getFallbackLabel(name, provider)}
        </Text>
      )}
    </View>
  );
};

export const BrandLogo = memo(BrandLogoComponent);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  fallbackText: {
    fontWeight: '900',
    letterSpacing: 0,
  },
});

export default BrandLogo;
