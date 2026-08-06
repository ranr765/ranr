/** Formatting. Numbers are the content of this app, so they get their own file. */

/** A thin space as the thousands separator — quieter than a comma at large sizes. */
export function kcal(value: number): string {
  return Math.round(value).toLocaleString('en-CH').replace(/[',]/g, ' ');
}

export function grams(value: number, digits = 0): string {
  return value.toFixed(digits);
}

export function signed(value: number): string {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${kcal(rounded)}` : kcal(rounded);
}

export const SLOT_LABEL: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  const yesterday = new Date(Date.parse(today + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10);
  if (date === yesterday) return 'Yesterday';
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
}

export function timeLabel(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: timezone,
  });
}

export const CONFIDENCE_LABEL: Record<string, string> = {
  measured: 'Measured',
  high: 'Good estimate',
  medium: 'Estimate',
  low: 'Rough estimate',
};

/** A stable id for offline-safe writes. */
export function clientId(): string {
  return crypto.randomUUID();
}
