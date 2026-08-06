/**
 * Target calculation — Mifflin-St Jeor BMR, activity multiplier, goal-derived
 * calorie and macro targets.
 *
 * The rules encoded here are hard constraints, not defaults:
 *   - rate of change is capped at 0.5–1.0% of body weight per week
 *   - the calorie target is never set below BMR
 *   - protein sits in 1.6–2.2 g/kg
 *
 * Every result carries the reasoning that produced it, so the UI can show the
 * calculated recommendation next to any manual override instead of hiding it.
 */

export type Sex = 'male' | 'female' | 'unspecified';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';

/** Energy density of body mass, kcal per kg. The conventional 7700. */
const KCAL_PER_KG = 7700;

export const ACTIVITY: Record<ActivityLevel, { multiplier: number; label: string; note: string }> = {
  sedentary:   { multiplier: 1.2,   label: 'Sedentary',    note: 'Desk work, little walking' },
  light:       { multiplier: 1.375, label: 'Lightly active', note: 'Some walking, light activity 1–3 days' },
  moderate:    { multiplier: 1.55,  label: 'Moderately active', note: 'On your feet, activity 3–5 days' },
  active:      { multiplier: 1.725, label: 'Active',       note: 'Physical work or activity most days' },
  very_active: { multiplier: 1.9,   label: 'Very active',  note: 'Hard physical work, or twice a day' },
};

/** Weekly rate of weight change, as a percentage of body weight. */
export const RATE_LIMITS = { min: 0.5, max: 1.0 } as const;

/** Protein, grams per kg of body weight. */
export const PROTEIN_LIMITS = { min: 1.6, max: 2.2 } as const;

export interface TargetInputs {
  sex: Sex;
  /** 'YYYY-MM-DD' */
  birthDate: string;
  heightCm: number;
  activity: ActivityLevel;
  goal: Goal;
  /** Requested weekly change as % of body weight. Clamped to RATE_LIMITS. */
  ratePctPerWeek: number;
  /** The weight targets are derived from — prefer a 7-day average over a single reading. */
  weightKg: number;
  /** Optional manual protein preference, g/kg. Clamped to PROTEIN_LIMITS. */
  proteinGPerKg?: number;
  /** Fraction of energy from fat, 0–1. Defaults to 0.30, floored by a g/kg minimum. */
  fatPctOfEnergy?: number;
  /** 'YYYY-MM-DD' — the date the calculation is made on. */
  today: string;
}

export interface TargetNote {
  /** Machine-readable so the UI can style specific cases. */
  code: 'rate_capped_high' | 'rate_capped_low' | 'floored_at_bmr' | 'protein_clamped' | 'fat_floored';
  message: string;
}

export interface Targets {
  bmr: number;
  tdee: number;
  activityMultiplier: number;
  /** The rate actually applied, after clamping. */
  ratePctPerWeek: number;
  /** Expected weight change per week in kg, signed. */
  kgPerWeek: number;
  /** Signed daily energy offset from TDEE. */
  dailyOffset: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  addedSugar: number;
  satFat: number;
  sodium: number;
  waterMl: number;
  proteinGPerKg: number;
  /** Anything the user should know about how this number was arrived at. */
  notes: TargetNote[];
}

export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

/**
 * Mifflin-St Jeor. The equation is defined for male and female only; for
 * 'unspecified' we take the midpoint of the two constants rather than assuming.
 */
export function bmrMifflinStJeor(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const constant = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
  return base + constant;
}

/**
 * Clamp a requested rate of change into the allowed band.
 * Returns the applied rate plus a note when it had to be changed.
 */
export function clampRate(requested: number, goal: Goal): { rate: number; note?: TargetNote } {
  if (goal === 'maintain') return { rate: 0 };
  const abs = Math.abs(requested);
  if (abs > RATE_LIMITS.max) {
    return {
      rate: RATE_LIMITS.max,
      note: {
        code: 'rate_capped_high',
        message:
          `${abs.toFixed(2)}% of body weight per week is faster than this app will set. ` +
          `Capped at ${RATE_LIMITS.max}%. Faster than that mostly costs muscle and is hard to hold.`,
      },
    };
  }
  if (abs < RATE_LIMITS.min) {
    return {
      rate: RATE_LIMITS.min,
      note: {
        code: 'rate_capped_low',
        message:
          `${abs.toFixed(2)}% per week is slow enough to be lost in the noise of daily weight. ` +
          `Set to ${RATE_LIMITS.min}%.`,
      },
    };
  }
  return { rate: abs };
}

export function computeTargets(input: TargetInputs): Targets {
  const notes: TargetNote[] = [];
  const age = ageOn(input.birthDate, input.today);
  const bmr = bmrMifflinStJeor(input.weightKg, input.heightCm, age, input.sex);
  const activityMultiplier = ACTIVITY[input.activity].multiplier;
  const tdee = bmr * activityMultiplier;

  const { rate, note: rateNote } = clampRate(input.ratePctPerWeek, input.goal);
  if (rateNote) notes.push(rateNote);

  const direction = input.goal === 'lose' ? -1 : input.goal === 'gain' ? 1 : 0;
  const kgPerWeek = direction * (rate / 100) * input.weightKg;
  const dailyOffset = (kgPerWeek * KCAL_PER_KG) / 7;

  let calories = tdee + dailyOffset;

  // Hard rule: never below BMR.
  if (calories < bmr) {
    notes.push({
      code: 'floored_at_bmr',
      message:
        `Held at your BMR of ${Math.round(bmr)} kcal — the energy your body uses at rest. ` +
        `Eating under that would mean losing faster than ${rate}% a week, which this app will not set.`,
    });
    calories = bmr;
  }
  calories = Math.round(calories);

  // Protein: generous, because a deficit without enough protein costs muscle.
  const defaultProteinPerKg = input.goal === 'lose' ? 2.0 : 1.8;
  let proteinGPerKg = input.proteinGPerKg ?? defaultProteinPerKg;
  if (proteinGPerKg < PROTEIN_LIMITS.min || proteinGPerKg > PROTEIN_LIMITS.max) {
    const clamped = Math.min(PROTEIN_LIMITS.max, Math.max(PROTEIN_LIMITS.min, proteinGPerKg));
    notes.push({
      code: 'protein_clamped',
      message: `Protein set to ${clamped} g/kg, the edge of the ${PROTEIN_LIMITS.min}–${PROTEIN_LIMITS.max} g/kg range this app works in.`,
    });
    proteinGPerKg = clamped;
  }
  const protein = Math.round(proteinGPerKg * input.weightKg);

  // Fat: a share of energy, with a floor in g/kg so a low-calorie day doesn't
  // push it somewhere unsustainable.
  const fatPct = input.fatPctOfEnergy ?? 0.3;
  const fatFloor = 0.7 * input.weightKg;
  let fat = (calories * fatPct) / 9;
  if (fat < fatFloor) {
    notes.push({
      code: 'fat_floored',
      message: `Fat held at ${Math.round(fatFloor)} g — roughly 0.7 g/kg, low enough already.`,
    });
    fat = fatFloor;
  }
  fat = Math.round(fat);

  // Carbs take what is left. Floored at zero rather than going negative on an
  // unusual combination of overrides.
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    activityMultiplier,
    ratePctPerWeek: rate,
    kgPerWeek: Number(kgPerWeek.toFixed(3)),
    dailyOffset: Math.round(dailyOffset),
    calories,
    protein,
    carbs,
    fat,
    fibre: Math.round((calories / 1000) * 14),
    addedSugar: Math.round((calories * 0.1) / 4),
    satFat: Math.round((calories * 0.1) / 9),
    sodium: 2000,
    waterMl: Math.round((33 * input.weightKg) / 50) * 50,
    proteinGPerKg,
    notes,
  };
}

/**
 * A 7-day trailing average, which is the weight targets should be based on.
 * A single morning reading is mostly water.
 */
export function rollingWeight(
  weights: Array<{ date: string; weightKg: number }>,
  onDate: string,
  windowDays = 7,
): number | null {
  if (weights.length === 0) return null;
  const end = Date.parse(onDate + 'T00:00:00Z');
  const start = end - (windowDays - 1) * 86_400_000;
  const inWindow = weights.filter((w) => {
    const t = Date.parse(w.date + 'T00:00:00Z');
    return t >= start && t <= end;
  });
  if (inWindow.length === 0) {
    // Nothing recent — fall back to the most recent reading at or before the date.
    const prior = weights
      .filter((w) => Date.parse(w.date + 'T00:00:00Z') <= end)
      .sort((a, b) => b.date.localeCompare(a.date));
    return prior.length ? prior[0].weightKg : null;
  }
  return inWindow.reduce((sum, w) => sum + w.weightKg, 0) / inWindow.length;
}
