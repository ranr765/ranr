import { useMemo, useState } from 'react';
import { api, type ActivityLevel, type Goal, type Me, type Sex } from '../lib/api.ts';
import { ACTIVITY, RATE_LIMITS, computeTargets } from '../../shared/targets.ts';
import { kcal } from '../lib/format.ts';

const SEXES: Array<{ value: Sex; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unspecified', label: 'Prefer not to say' },
];

const GOALS: Array<{ value: Goal; label: string }> = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Gain weight' },
];

export function Onboarding({ me, onDone }: { me: Me | null; onDone: () => void }) {
  const p = me?.profile;
  const [displayName, setDisplayName] = useState(p?.displayName ?? '');
  const [sex, setSex] = useState<Sex>(p?.sex ?? 'unspecified');
  const [birthDate, setBirthDate] = useState(p?.birthDate ?? '');
  const [heightCm, setHeightCm] = useState(p?.heightCm ? String(p.heightCm) : '');
  const [weightKg, setWeightKg] = useState(
    me?.targets.basedOnWeightKg ? String(me.targets.basedOnWeightKg) : '',
  );
  const [activity, setActivity] = useState<ActivityLevel>(p?.activity ?? 'light');
  const [goal, setGoal] = useState<Goal>(p?.goal ?? 'maintain');
  const [rate, setRate] = useState(String(p?.ratePctPerWeek ?? 0.5));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const requestedRate = Number(rate);
  const complete = birthDate && Number(heightCm) > 0 && Number(weightKg) > 0;

  // Calculated live, from the same module the server uses. What you see here is
  // exactly what gets saved.
  const preview = useMemo(() => {
    if (!complete) return null;
    return computeTargets({
      sex, birthDate, heightCm: Number(heightCm), activity, goal,
      ratePctPerWeek: requestedRate, weightKg: Number(weightKg),
      today: new Date().toISOString().slice(0, 10),
    });
  }, [complete, sex, birthDate, heightCm, activity, goal, requestedRate, weightKg]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.saveProfile({
        displayName: displayName || null,
        sex, birthDate, heightCm: Number(heightCm), activity, goal,
        ratePctPerWeek: requestedRate,
        weightKg: Number(weightKg),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save.');
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <h1 className="topbar__date" style={{ fontSize: 'var(--step-2)' }}>About you</h1>
      </header>
      <p className="quiet" style={{ marginTop: 0 }}>
        Enough to work out a daily target. You can change any of it later.
      </p>

      <section>
        <div className="field">
          <label className="field__label" htmlFor="name">Name (optional)</label>
          <input id="name" className="input" value={displayName}
                 onChange={(e) => setDisplayName(e.target.value)} />
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: '0 0 var(--space-4)' }}>
          <legend className="field__label" style={{ padding: 0 }}>Sex</legend>
          <p className="field__hint" style={{ marginTop: 0 }}>
            Used only by the BMR equation, which is defined for male and female.
          </p>
          <div className="choice-row">
            {SEXES.map((s) => (
              <button key={s.value} type="button" className="choice"
                      aria-pressed={sex === s.value} onClick={() => setSex(s.value)}>
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label className="field__label" htmlFor="dob">Date of birth</label>
          <input id="dob" className="input input--num" type="date" value={birthDate}
                 onChange={(e) => setBirthDate(e.target.value)} />
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div className="field grow">
            <label className="field__label" htmlFor="height">Height (cm)</label>
            <input id="height" className="input input--num" type="number" inputMode="decimal"
                   min={80} max={250} value={heightCm}
                   onChange={(e) => setHeightCm(e.target.value)} />
          </div>
          <div className="field grow">
            <label className="field__label" htmlFor="weight">Weight (kg)</label>
            <input id="weight" className="input input--num" type="number" inputMode="decimal"
                   step="0.1" min={20} max={400} value={weightKg}
                   onChange={(e) => setWeightKg(e.target.value)} />
          </div>
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: '0 0 var(--space-4)' }}>
          <legend className="field__label" style={{ padding: 0 }}>Daily activity</legend>
          <div className="stack" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            {(Object.keys(ACTIVITY) as ActivityLevel[]).map((level) => (
              <button key={level} type="button" className="choice"
                      style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)' }}
                      aria-pressed={activity === level} onClick={() => setActivity(level)}>
                <span>{ACTIVITY[level].label}</span>
                <span className="small quiet" style={{ display: 'block' }}>{ACTIVITY[level].note}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset style={{ border: 0, padding: 0, margin: '0 0 var(--space-4)' }}>
          <legend className="field__label" style={{ padding: 0 }}>Goal</legend>
          <div className="choice-row" style={{ marginTop: 'var(--space-2)' }}>
            {GOALS.map((g) => (
              <button key={g.value} type="button" className="choice"
                      aria-pressed={goal === g.value} onClick={() => setGoal(g.value)}>
                {g.label}
              </button>
            ))}
          </div>
        </fieldset>

        {goal !== 'maintain' && (
          <div className="field">
            <label className="field__label" htmlFor="rate">
              Rate — percent of body weight per week
            </label>
            <input
              id="rate" className="input input--num" type="range"
              min={0.25} max={1.5} step={0.05} value={rate}
              onChange={(e) => setRate(e.target.value)}
              style={{ padding: 0, border: 0, background: 'transparent' }}
            />
            <p className="field__hint">
              <span className="num">{requestedRate.toFixed(2)}%</span> — about{' '}
              <span className="num">
                {(Number(weightKg || 0) * requestedRate / 100).toFixed(2)}
              </span> kg a week.
              {' '}This app works between {RATE_LIMITS.min}% and {RATE_LIMITS.max}%.
            </p>
          </div>
        )}
      </section>

      {preview && (
        <section>
          <h2 className="section-label">What that works out to</h2>
          <div className="stack" style={{ gap: 'var(--space-3)' }}>
            <div className="row row--between">
              <span>Daily calories</span>
              <span className="num" style={{ fontSize: 'var(--step-2)' }}>{kcal(preview.calories)}</span>
            </div>
            <div className="row row--between small quiet">
              <span>BMR (at rest)</span><span className="num">{kcal(preview.bmr)}</span>
            </div>
            <div className="row row--between small quiet">
              <span>Maintenance (BMR × {preview.activityMultiplier})</span>
              <span className="num">{kcal(preview.tdee)}</span>
            </div>
            <div className="row row--between small quiet">
              <span>Protein</span><span className="num">{preview.protein} g</span>
            </div>
            <div className="row row--between small quiet">
              <span>Carbs · Fat</span>
              <span className="num">{preview.carbs} g · {preview.fat} g</span>
            </div>
          </div>

          {preview.notes.length > 0 && (
            <div className="stack" style={{ marginTop: 'var(--space-4)', gap: 'var(--space-2)' }}>
              {preview.notes.map((note) => (
                <p key={note.code} className="banner">{note.message}</p>
              ))}
            </div>
          )}
        </section>
      )}

      {error && <p role="alert" className="banner" style={{ marginTop: 'var(--space-4)' }}>{error}</p>}

      <div className="actionbar">
        <div className="actionbar__inner">
          <button className="btn btn--primary btn--block" onClick={save} disabled={!complete || busy}>
            {busy ? 'Saving…' : 'Save and start'}
          </button>
        </div>
      </div>
    </main>
  );
}
