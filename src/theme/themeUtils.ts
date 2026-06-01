import type { AppTheme } from './ThemeContext';
import type { SubscriptionCategory } from '../types/api';

const clampAlpha = (alpha: number) => Math.max(0, Math.min(1, alpha));

export function withAlpha(color: string, alpha: number) {
  const safeAlpha = clampAlpha(alpha);
  const normalized = color.trim();

  if (normalized === 'transparent') {
    return normalized;
  }

  const shortHex = /^#([0-9a-f]{3})$/i.exec(normalized);
  if (shortHex) {
    const [r, g, b] = shortHex[1].split('').map((part) => parseInt(`${part}${part}`, 16));
    return `rgba(${r},${g},${b},${safeAlpha})`;
  }

  const longHex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(normalized);
  if (longHex) {
    const value = longHex[1];
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${safeAlpha})`;
  }

  const rgb = /^rgba?\(([^)]+)\)$/i.exec(normalized);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((part) => part.trim());
    return `rgba(${r},${g},${b},${safeAlpha})`;
  }

  return normalized;
}

export function getCategoryTone(theme: AppTheme, category?: SubscriptionCategory | string | null) {
  const key = String(category || 'other');
  const accent =
    key === 'entertainment' ? theme.colors.violet :
    key === 'productivity' ? theme.colors.primary :
    key === 'utilities' ? theme.colors.cyan :
    key === 'finance' ? theme.colors.warning :
    key === 'health' ? theme.colors.danger :
    key === 'education' ? theme.colors.success :
    key === 'shopping' ? theme.colors.pink :
    key === 'transport' ? theme.colors.cyan :
    theme.colors.textMuted;

  return {
    accent,
    background: withAlpha(accent, 0.16),
    border: withAlpha(accent, 0.34),
    text: accent,
  };
}

export function getStatusTone(theme: AppTheme, status?: string | null) {
  if (status === 'canceled' || status === 'risky' || status === 'overdue') {
    return {
      accent: theme.colors.danger,
      background: withAlpha(theme.colors.danger, 0.14),
      border: withAlpha(theme.colors.danger, 0.32),
    };
  }

  if (status === 'trial' || status === 'needs_attention' || status === 'warning') {
    return {
      accent: theme.colors.warning,
      background: withAlpha(theme.colors.warning, 0.14),
      border: withAlpha(theme.colors.warning, 0.32),
    };
  }

  return {
    accent: theme.colors.primary,
    background: withAlpha(theme.colors.primary, 0.14),
    border: withAlpha(theme.colors.primary, 0.32),
  };
}
