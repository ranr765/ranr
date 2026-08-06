/**
 * "Where do I stand" — the logic behind the signature screen.
 *
 * Two ideas do the work here:
 *   1. Pacing is measured against how people actually eat across a day, not
 *      against a straight line. At 2pm a linear model says you should have had
 *      58% of your calories; in practice lunch has happened and dinner has not.
 *   2. What's left is described in food, not arithmetic. "Roughly a normal
 *      dinner's worth" is actionable. "743 kcal remaining" is a number you then
 *      have to translate yourself, every single time.
 *
 * Nothing in here judges. Over target is a fact, reported flatly.
 */

export type Slot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  addedSugar: number;
  satFat: number;
  sodium: number;
}

export const ZERO: Nutrients = {
  kcal: 0, protein: 0, carbs: 0, fat: 0,
  fibre: 0, addedSugar: 0, satFat: 0, sodium: 0,
};

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fibre: a.fibre + b.fibre,
    addedSugar: a.addedSugar + b.addedSugar,
    satFat: a.satFat + b.satFat,
    sodium: a.sodium + b.sodium,
  };
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  return items.reduce(addNutrients, ZERO);
}

/**
 * Cumulative share of a day's energy typically eaten by a given local hour.
 * Anchors, linearly interpolated between. Deliberately gentle: the point is to
 * avoid telling someone at 11am that they are dramatically behind.
 */
const PACING_ANCHORS: Array<[hour: number, cumulative: number]> = [
  [0, 0],
  [6, 0],
  [8.5, 0.20],   // breakfast
  [11, 0.22],
  [13, 0.50],    // lunch
  [16.5, 0.58],  // afternoon
  [19.5, 0.93],  // dinner
  [22, 1.0],
  [24, 1.0],
];

/** Expected cumulative fraction of the day's calories by `hour` (local, fractional). */
export function expectedFractionByHour(hour: number): number {
  const h = Math.max(0, Math.min(24, hour));
  for (let i = 1; i < PACING_ANCHORS.length; i++) {
    const [h1, f1] = PACING_ANCHORS[i];
    const [h0, f0] = PACING_ANCHORS[i - 1];
    if (h <= h1) {
      if (h1 === h0) return f1;
      return f0 + ((h - h0) / (h1 - h0)) * (f1 - f0);
    }
  }
  return 1;
}

export type PaceState = 'early' | 'on_pace' | 'ahead' | 'day_done';

export interface Pace {
  state: PaceState;
  /** Actual share of target consumed. */
  actualFraction: number;
  /** Share a typical day would have reached by now. */
  expectedFraction: number;
  /** Plain, neutral sentence. Never a warning. */
  message: string;
}

/**
 * How the day is pacing. `hour` is the local fractional hour (14.5 === 14:30).
 */
export function pacing(consumedKcal: number, targetKcal: number, hour: number): Pace {
  const expected = expectedFractionByHour(hour);
  const actual = targetKcal > 0 ? consumedKcal / targetKcal : 0;
  const pct = Math.round(actual * 100);

  if (hour >= 22) {
    return {
      state: 'day_done',
      actualFraction: actual,
      expectedFraction: expected,
      message: `${pct}% of today's calories.`,
    };
  }
  // Before anything has been logged, say so plainly rather than reading it as "behind".
  if (consumedKcal === 0) {
    return {
      state: 'early',
      actualFraction: 0,
      expectedFraction: expected,
      message: 'Nothing logged yet today.',
    };
  }

  const drift = actual - expected;
  if (drift > 0.12) {
    return {
      state: 'ahead',
      actualFraction: actual,
      expectedFraction: expected,
      message: `${pct}% of today's calories — ahead of a usual day at this hour.`,
    };
  }
  if (drift < -0.12) {
    return {
      state: 'early',
      actualFraction: actual,
      expectedFraction: expected,
      message: `${pct}% of today's calories — a usual day is further along by now.`,
    };
  }
  return {
    state: 'on_pace',
    actualFraction: actual,
    expectedFraction: expected,
    message: `${pct}% of today's calories — about where a usual day sits at this hour.`,
  };
}

/** Fallback shares of a day's energy per meal, used until there is personal history. */
const DEFAULT_SLOT_SHARE: Record<Slot, number> = {
  breakfast: 0.22,
  lunch: 0.32,
  dinner: 0.35,
  snack: 0.11,
};

export type SlotAverages = Partial<Record<Slot, number>>;

export function slotAveragesOrDefaults(target: number, history: SlotAverages): Record<Slot, number> {
  return {
    breakfast: history.breakfast ?? target * DEFAULT_SLOT_SHARE.breakfast,
    lunch: history.lunch ?? target * DEFAULT_SLOT_SHARE.lunch,
    dinner: history.dinner ?? target * DEFAULT_SLOT_SHARE.dinner,
    snack: history.snack ?? target * DEFAULT_SLOT_SHARE.snack,
  };
}

export interface BudgetDescription {
  /** The sentence shown under the remaining number. */
  text: string;
  /** For styling only — never used to scold. */
  kind: 'over' | 'at' | 'small' | 'snack' | 'light_meal' | 'meal' | 'plenty';
}

/**
 * Translate calories remaining into something you can act on, using the user's
 * own typical meal sizes where they exist.
 */
export function describeBudget(
  remaining: number,
  target: number,
  history: SlotAverages = {},
): BudgetDescription {
  const avg = slotAveragesOrDefaults(target, history);

  if (remaining < -50) {
    return { text: `${Math.abs(Math.round(remaining))} over today's target.`, kind: 'over' };
  }
  if (remaining <= 50) {
    return { text: `You're at today's target.`, kind: 'at' };
  }
  if (remaining >= target * 0.8) {
    return { text: `Most of the day's food still to come.`, kind: 'plenty' };
  }
  if (remaining >= avg.dinner * 1.35) {
    return { text: `More than a usual dinner's worth left.`, kind: 'plenty' };
  }
  if (remaining >= avg.dinner * 0.8) {
    return { text: `Roughly a usual dinner's worth left.`, kind: 'meal' };
  }
  if (remaining >= avg.lunch * 0.7) {
    return { text: `About a light meal's worth left.`, kind: 'light_meal' };
  }
  if (remaining >= avg.snack * 0.7) {
    return { text: `About a snack's worth left.`, kind: 'snack' };
  }
  return { text: `A small snack's worth left.`, kind: 'small' };
}

/**
 * Logging streaks only. Never a streak for eating below a number, and a grace
 * day so one missed evening doesn't erase months.
 *
 * `dates` is the set of dates with at least one entry, any order.
 */
export function loggingStreak(dates: Iterable<string>, today: string, graceDays = 1): {
  current: number;
  graceUsed: boolean;
} {
  const set = new Set(dates);
  const day = (offset: number) => {
    const t = Date.parse(today + 'T00:00:00Z') + offset * 86_400_000;
    return new Date(t).toISOString().slice(0, 10);
  };

  let count = 0;
  let misses = 0;
  // Today not yet logged is not a broken streak — the day isn't over.
  let i = set.has(day(0)) ? 0 : -1;

  for (; i > -400; i--) {
    if (set.has(day(i))) {
      count++;
    } else {
      misses++;
      if (misses > graceDays) break;
    }
  }
  return { current: count, graceUsed: misses > 0 };
}
