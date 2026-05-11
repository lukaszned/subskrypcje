const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseAppDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return startOfLocalDay(value);
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfLocalDay(parsed);
}

export function formatInputDate(date: Date) {
  const localDate = startOfLocalDay(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysUntilDate(value: string | Date | null | undefined, now = new Date()) {
  const target = parseAppDate(value);
  if (!target) return null;

  const today = startOfLocalDay(now);
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

export function formatRelativeDay(value: string | Date | null | undefined, now = new Date()) {
  const days = daysUntilDate(value, now);
  if (days === null) return 'Brak daty';
  if (days < 0) return days === -1 ? 'Wczoraj' : `${Math.abs(days)} dni po terminie`;
  if (days === 0) return 'Dzisiaj';
  if (days === 1) return 'Jutro';
  return `Za ${days} dni`;
}

export function formatShortDate(value: string | Date | null | undefined) {
  const date = parseAppDate(value);
  if (!date) return '-';

  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: 'short',
  });
}
