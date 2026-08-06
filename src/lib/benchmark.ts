/**
 * Logging a meal has to stay under ten seconds end to end. That is a
 * requirement, not an aspiration, so it gets measured on every real log rather
 * than once in a lab — the timings are from actual use, on the actual phone.
 *
 * Kept entirely local: written to localStorage, never sent anywhere.
 */

const KEY = 'standing.log-timings';
const BUDGET_MS = 10_000;
const KEEP = 50;

let startedAt: number | null = null;

export function markLogStart(): void {
  startedAt = performance.now();
  performance.mark?.('standing:log-start');
}

export function markLogged(): number | null {
  if (startedAt === null) return null;
  const duration = performance.now() - startedAt;
  startedAt = null;
  performance.mark?.('standing:log-end');
  try {
    const timings: number[] = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    timings.push(Math.round(duration));
    localStorage.setItem(KEY, JSON.stringify(timings.slice(-KEEP)));
  } catch {
    // A full or blocked localStorage must never stop a meal being logged.
  }
  return duration;
}

export interface LogTimings {
  count: number;
  medianMs: number;
  slowestMs: number;
  withinBudget: number;
  budgetMs: number;
}

export function readTimings(): LogTimings | null {
  let timings: number[] = [];
  try {
    timings = JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return null;
  }
  if (timings.length === 0) return null;
  const sorted = [...timings].sort((a, b) => a - b);
  return {
    count: sorted.length,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    slowestMs: sorted[sorted.length - 1],
    withinBudget: sorted.filter((t) => t <= BUDGET_MS).length,
    budgetMs: BUDGET_MS,
  };
}
