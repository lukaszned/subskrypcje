import type { AppTheme } from '../theme/ThemeContext';
import type { SubscriptionStatus } from '../types/api';
import { withAlpha } from '../theme/themeUtils';

export type SubscriptionDisplayStatus = 'active' | 'trial' | 'canceled';

type SubscriptionStatusSource = {
  status?: SubscriptionStatus | string | null;
  isTrial?: boolean | null;
  isCancelled?: boolean | null;
  isCanceled?: boolean | null;
  canceledAt?: string | null;
};

export function getSubscriptionDisplayStatus(source: SubscriptionStatusSource): SubscriptionDisplayStatus {
  if (source.isCancelled || source.isCanceled || source.status === 'canceled' || Boolean(source.canceledAt)) {
    return 'canceled';
  }

  if (source.isTrial) {
    return 'trial';
  }

  return 'active';
}

export function getSubscriptionDisplayStatusTone(theme: AppTheme, displayStatus: SubscriptionDisplayStatus) {
  if (displayStatus === 'canceled') {
    return {
      label: 'Anulowana',
      accent: theme.colors.textSubtle,
      badgeBg: withAlpha(theme.colors.text, 0.08),
      cardBg: withAlpha(theme.colors.text, 0.045),
      border: withAlpha(theme.colors.text, 0.11),
      rail: withAlpha(theme.colors.textMuted, 0.42),
      shadow: theme.colors.bg,
      muted: true,
    };
  }

  if (displayStatus === 'trial') {
    return {
      label: 'Okres próbny',
      accent: theme.colors.warning,
      badgeBg: withAlpha(theme.colors.warning, 0.16),
      cardBg: withAlpha(theme.colors.warning, 0.08),
      border: withAlpha(theme.colors.warning, 0.34),
      rail: withAlpha(theme.colors.warning, 0.86),
      shadow: theme.colors.warning,
      muted: false,
    };
  }

  return {
    label: 'Aktywna',
    accent: theme.colors.primary,
    badgeBg: withAlpha(theme.colors.primary, 0.16),
    cardBg: withAlpha(theme.colors.primary, 0.07),
    border: withAlpha(theme.colors.primary, 0.28),
    rail: withAlpha(theme.colors.primary, 0.86),
    shadow: theme.colors.primary,
    muted: false,
  };
}
