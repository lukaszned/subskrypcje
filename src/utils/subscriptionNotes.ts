import { daysUntilDate, formatInputDate, parseAppDate } from './date';

export interface SubscriptionNotesMetadata {
  text: string;
  isShared?: boolean;
  peopleCount?: number;
  includeInStats?: boolean;
  isSeasonal?: boolean;
  seasonEndDate?: string;
  seasonReason?: string;
}

export function parseSubscriptionNotes(notes?: string | null): SubscriptionNotesMetadata {
  if (!notes) return { text: '' };

  try {
    if (notes.trim().startsWith('{')) {
      const parsed = JSON.parse(notes) as Partial<SubscriptionNotesMetadata>;
      return {
        text: typeof parsed.text === 'string' ? parsed.text : '',
        isShared: parsed.isShared,
        peopleCount: parsed.peopleCount,
        includeInStats: parsed.includeInStats,
        isSeasonal: parsed.isSeasonal,
        seasonEndDate: parsed.seasonEndDate,
        seasonReason: parsed.seasonReason,
      };
    }
  } catch {
    return { text: notes };
  }

  return { text: notes };
}

export function buildSubscriptionNotesPayload(metadata: SubscriptionNotesMetadata) {
  return JSON.stringify({
    text: metadata.text?.trim() || '',
    isShared: metadata.isShared,
    peopleCount: metadata.isShared ? metadata.peopleCount : undefined,
    includeInStats: metadata.includeInStats,
    isSeasonal: metadata.isSeasonal,
    seasonEndDate: metadata.isSeasonal && metadata.seasonEndDate ? metadata.seasonEndDate : undefined,
    seasonReason: metadata.isSeasonal && metadata.seasonReason?.trim() ? metadata.seasonReason.trim() : undefined,
  });
}

export function formatSeasonEndDate(value?: string | null) {
  const parsed = parseAppDate(value);
  if (!parsed) return null;

  return parsed.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getSeasonalStatus(notes?: string | null) {
  const parsed = parseSubscriptionNotes(notes);
  if (!parsed.isSeasonal) {
    return {
      isSeasonal: false,
      label: null as string | null,
      hint: null as string | null,
      daysLeft: null as number | null,
      seasonEndDate: null as string | null,
      reason: null as string | null,
    };
  }

  const daysLeft = parsed.seasonEndDate ? daysUntilDate(parsed.seasonEndDate) : null;
  const formattedDate = formatSeasonEndDate(parsed.seasonEndDate);
  const label = formattedDate ? `Sezon do ${formattedDate}` : 'Sezonowa';
  const hint = daysLeft === null
    ? 'Oznaczona jako sezonowa. Ustaw datę końca sezonu, żeby dostać lepszy kontekst decyzji.'
    : daysLeft < 0
      ? `Sezon minął ${Math.abs(daysLeft)} dni temu. Warto sprawdzić, czy nadal jej potrzebujesz.`
      : daysLeft === 0
        ? 'Sezon kończy się dziś. To dobry moment na decyzję.'
        : `Sprawdź za ${daysLeft} dni, czy ta usługa nadal jest potrzebna.`;

  return {
    isSeasonal: true,
    label,
    hint,
    daysLeft,
    seasonEndDate: parsed.seasonEndDate || null,
    reason: parsed.seasonReason || null,
  };
}

export function dateToSeasonInput(date: Date) {
  return formatInputDate(date);
}
