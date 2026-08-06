import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTargets, bmrMifflinStJeor, clampRate, ageOn, rollingWeight, RATE_LIMITS } from './targets.ts';
import { pacing, describeBudget, expectedFractionByHour, loggingStreak, sumNutrients, ZERO } from './standing.ts';

const base = {
  sex: 'male' as const,
  birthDate: '1985-03-14',
  heightCm: 175,
  activity: 'light' as const,
  goal: 'lose' as const,
  ratePctPerWeek: 0.7,
  weightKg: 82,
  today: '2026-08-06',
};

test('age accounts for whether the birthday has passed', () => {
  assert.equal(ageOn('1985-03-14', '2026-08-06'), 41);
  assert.equal(ageOn('1985-12-14', '2026-08-06'), 40);
  assert.equal(ageOn('1985-08-06', '2026-08-06'), 41); // birthday today
});

test('Mifflin-St Jeor matches the published equation', () => {
  // 10*82 + 6.25*175 - 5*41 + 5 = 820 + 1093.75 - 205 + 5
  assert.equal(bmrMifflinStJeor(82, 175, 41, 'male'), 1713.75);
  assert.equal(bmrMifflinStJeor(82, 175, 41, 'female'), 1547.75);
});

test('rate is capped at 1% of body weight per week', () => {
  const { rate, note } = clampRate(2.5, 'lose');
  assert.equal(rate, RATE_LIMITS.max);
  assert.equal(note?.code, 'rate_capped_high');
});

test('an aggressive request cannot produce an extreme deficit', () => {
  const gentle = computeTargets({ ...base, ratePctPerWeek: 0.5 });
  const extreme = computeTargets({ ...base, ratePctPerWeek: 5 });
  // 5%/week must land on exactly the same floor as 1%/week, not lower.
  assert.equal(extreme.calories, computeTargets({ ...base, ratePctPerWeek: 1.0 }).calories);
  assert.ok(extreme.calories < gentle.calories);
  assert.ok(extreme.notes.some((n) => n.code === 'rate_capped_high'));
});

test('the target is never below BMR', () => {
  // A small, sedentary person asking for the maximum rate is the case that
  // would otherwise push the target under BMR.
  const t = computeTargets({
    ...base, sex: 'female', heightCm: 152, weightKg: 95,
    activity: 'sedentary', ratePctPerWeek: 1.0,
  });
  assert.ok(t.calories >= t.bmr, `${t.calories} should be >= BMR ${t.bmr}`);
  assert.ok(t.notes.some((n) => n.code === 'floored_at_bmr'));
});

test('protein is generous and stays inside 1.6–2.2 g/kg', () => {
  const t = computeTargets(base);
  assert.ok(t.proteinGPerKg >= 1.6 && t.proteinGPerKg <= 2.2);
  assert.equal(t.protein, Math.round(2.0 * 82)); // cutting -> 2.0 g/kg
  const clamped = computeTargets({ ...base, proteinGPerKg: 3.5 });
  assert.equal(clamped.proteinGPerKg, 2.2);
  assert.ok(clamped.notes.some((n) => n.code === 'protein_clamped'));
});

test('macros account for the whole calorie target', () => {
  const t = computeTargets(base);
  const fromMacros = t.protein * 4 + t.carbs * 4 + t.fat * 9;
  assert.ok(Math.abs(fromMacros - t.calories) <= 5, `${fromMacros} vs ${t.calories}`);
});

test('maintain applies no offset', () => {
  const t = computeTargets({ ...base, goal: 'maintain', ratePctPerWeek: 0.7 });
  assert.equal(t.dailyOffset, 0);
  assert.equal(t.calories, t.tdee);
});

test('gain adds a surplus under the same cap', () => {
  const t = computeTargets({ ...base, goal: 'gain', ratePctPerWeek: 3 });
  assert.ok(t.calories > t.tdee);
  assert.equal(t.ratePctPerWeek, RATE_LIMITS.max);
});

test('targets move as weight changes', () => {
  const start = computeTargets({ ...base, weightKg: 92 });
  const later = computeTargets({ ...base, weightKg: 82 });
  assert.ok(later.calories < start.calories, 'a lighter body needs fewer calories');
  assert.ok(later.protein < start.protein);
});

test('rolling weight prefers the window, falls back to the last reading', () => {
  const w = [
    { date: '2026-08-01', weightKg: 82.4 },
    { date: '2026-08-03', weightKg: 81.6 },
    { date: '2026-08-06', weightKg: 82.0 },
  ];
  assert.equal(Number(rollingWeight(w, '2026-08-06')!.toFixed(2)), 82.0);
  // Nothing in the last 7 days -> most recent prior reading.
  assert.equal(rollingWeight(w, '2026-09-30'), 82.0);
  assert.equal(rollingWeight([], '2026-08-06'), null);
});

test('pacing is meal-shaped, not linear', () => {
  // Mid-afternoon: lunch has happened, dinner has not.
  assert.ok(expectedFractionByHour(14) > 0.5 && expectedFractionByHour(14) < 0.6);
  assert.equal(expectedFractionByHour(5), 0);
  assert.equal(expectedFractionByHour(23), 1);
});

test('pacing language stays neutral and handles an empty day', () => {
  assert.equal(pacing(0, 2000, 11).state, 'early');
  assert.equal(pacing(0, 2000, 11).message, 'Nothing logged yet today.');
  assert.equal(pacing(1000, 2000, 14).state, 'on_pace');
  assert.equal(pacing(1900, 2000, 14).state, 'ahead');
  for (const p of [pacing(2600, 2000, 20), pacing(300, 2000, 20)]) {
    assert.doesNotMatch(p.message, /over budget|too much|failed|bad|should/i);
  }
});

test('remaining calories are described as food', () => {
  const target = 2100;
  assert.equal(describeBudget(700, target).kind, 'meal');
  assert.match(describeBudget(700, target).text, /dinner/);
  assert.equal(describeBudget(220, target).kind, 'snack');
  assert.equal(describeBudget(90, target).kind, 'small');
  assert.equal(describeBudget(0, target).kind, 'at');
  assert.equal(describeBudget(-300, target).kind, 'over');
  // Over target is stated, not alarmed about.
  assert.equal(describeBudget(-300, target).text, "300 over today's target.");
  // Personal history beats the default share.
  const bigDinner = describeBudget(1000, target, { dinner: 1050 });
  assert.equal(bigDinner.kind, 'meal');
});

test('logging streak includes a grace day and ignores an unfinished today', () => {
  const dates = ['2026-08-05', '2026-08-04', '2026-08-02', '2026-08-01', '2026-07-31'];
  // 2026-08-03 is missing, but one grace day carries the streak through it.
  const s = loggingStreak(dates, '2026-08-06');
  assert.equal(s.current, 5);
  assert.ok(s.graceUsed);
  // Two misses ends it.
  const broken = loggingStreak(['2026-08-05', '2026-08-01'], '2026-08-06');
  assert.equal(broken.current, 1);
});

test('nutrient sums start from zero', () => {
  assert.deepEqual(sumNutrients([]), ZERO);
  const a = { ...ZERO, kcal: 100, protein: 10 };
  const b = { ...ZERO, kcal: 250, protein: 4, sodium: 300 };
  const t = sumNutrients([a, b]);
  assert.equal(t.kcal, 350);
  assert.equal(t.protein, 14);
  assert.equal(t.sodium, 300);
});
