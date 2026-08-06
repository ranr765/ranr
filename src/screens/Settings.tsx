import { useState } from 'react';
import { api, type Me } from '../lib/api.ts';
import { Onboarding } from './Onboarding.tsx';
import { readTimings } from '../lib/benchmark.ts';
import { kcal } from '../lib/format.ts';

const OVERRIDE_FIELDS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', calc: (c: any) => c?.calories },
  { key: 'protein', label: 'Protein', unit: 'g', calc: (c: any) => c?.protein },
  { key: 'carbs', label: 'Carbs', unit: 'g', calc: (c: any) => c?.carbs },
  { key: 'fat', label: 'Fat', unit: 'g', calc: (c: any) => c?.fat },
] as const;

const COLUMN: Record<string, string> = {
  calories: 'calories', protein: 'protein_g', carbs: 'carbs_g', fat: 'fat_g',
};

export function Settings({
  me, onBack, onSignedOut,
}: {
  me: Me;
  onBack: () => void;
  onSignedOut: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [targets, setTargets] = useState(me.targets);
  const [weight, setWeight] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const timings = readTimings();

  if (editing) {
    return <Onboarding me={{ ...me, targets }} onDone={() => { setEditing(false); onBack(); }} />;
  }

  async function saveOverride(key: string, raw: string) {
    const value = raw.trim() === '' ? null : Number(raw);
    const res = await api.saveTargets({ [key]: value });
    setTargets(res.targets);
    setSaved(key);
    window.setTimeout(() => setSaved(null), 1600);
  }

  async function saveWeight() {
    const value = Number(weight);
    if (!value) return;
    await api.addWeight(value);
    setWeight('');
    const fresh = await api.me();
    setTargets(fresh.targets);
    setSaved('weight');
    window.setTimeout(() => setSaved(null), 1600);
  }

  const calculated = targets.calculated;

  return (
    <main className="shell">
      <header className="topbar">
        <h1 className="topbar__date" style={{ fontSize: 'var(--step-2)' }}>Settings</h1>
        <button className="btn btn--ghost" onClick={onBack} style={{ minHeight: 'auto', padding: 'var(--space-2)' }}>
          Done
        </button>
      </header>

      <section>
        <h2 className="section-label">Today's weight</h2>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <input
            className="input input--num grow" type="number" step="0.1" min="20" max="400"
            inputMode="decimal" placeholder={targets.basedOnWeightKg ? String(targets.basedOnWeightKg) : 'kg'}
            value={weight} onChange={(e) => setWeight(e.target.value)}
            aria-label="Today's weight in kilograms"
          />
          <button className="btn btn--quiet" onClick={saveWeight} disabled={!weight}>Save</button>
        </div>
        <p className="field__hint" style={{ marginTop: 'var(--space-2)' }}>
          Targets follow a 7-day average, not a single morning's reading. A target set at
          the start of a cut is wrong three months later, so it moves as you do.
          {saved === 'weight' && ' Saved.'}
        </p>
      </section>

      <section>
        <h2 className="section-label">Targets</h2>
        {calculated ? (
          <div className="stack">
            {OVERRIDE_FIELDS.map((field) => {
              const column = COLUMN[field.key];
              const override = targets.overrides[column];
              const recommended = field.calc(calculated);
              return (
                <div key={field.key} className="field" style={{ marginBottom: 0 }}>
                  <label className="field__label" htmlFor={`t-${field.key}`}>
                    {field.label} ({field.unit})
                  </label>
                  <div className="row" style={{ gap: 'var(--space-2)' }}>
                    <input
                      id={`t-${field.key}`} className="input input--num grow" type="number"
                      inputMode="numeric" placeholder={String(Math.round(recommended))}
                      defaultValue={override ?? ''}
                      onBlur={(e) => saveOverride(field.key, e.target.value)}
                    />
                    {override != null && (
                      <button className="btn btn--ghost" onClick={() => saveOverride(field.key, '')}>
                        Reset
                      </button>
                    )}
                  </div>
                  <p className="field__hint">
                    Calculated: <span className="num">{Math.round(recommended)}</span> {field.unit}
                    {override != null && ' — yours is in use.'}
                    {saved === field.key && ' Saved.'}
                  </p>
                </div>
              );
            })}

            {calculated.notes.length > 0 && (
              <div className="stack" style={{ gap: 'var(--space-2)' }}>
                {calculated.notes.map((note) => (
                  <p key={note.code} className="banner">{note.message}</p>
                ))}
              </div>
            )}

            <p className="small quiet">
              From a BMR of <span className="num">{kcal(calculated.bmr)}</span> kcal
              (Mifflin-St Jeor) × {calculated.activityMultiplier} for activity
              {calculated.dailyOffset !== 0 && (
                <>, {calculated.dailyOffset < 0 ? 'less' : 'plus'}{' '}
                <span className="num">{Math.abs(calculated.dailyOffset)}</span> kcal a day
                for {Math.abs(calculated.kgPerWeek).toFixed(2)} kg a week</>
              )}.
            </p>
          </div>
        ) : (
          <p className="quiet">Add your height, date of birth and a weight to see targets.</p>
        )}
      </section>

      <section>
        <h2 className="section-label">You</h2>
        <button className="btn btn--quiet btn--block" onClick={() => setEditing(true)}>
          Edit your details
        </button>
        <p className="field__hint" style={{ marginTop: 'var(--space-2)' }}>
          Signed in as {me.user.email} · {me.profile.timezone}
        </p>
      </section>

      {timings && (
        <section>
          <h2 className="section-label">Logging speed</h2>
          <p className="small quiet">
            Median <span className="num">{(timings.medianMs / 1000).toFixed(1)}s</span> over
            the last <span className="num">{timings.count}</span> logs · slowest{' '}
            <span className="num">{(timings.slowestMs / 1000).toFixed(1)}s</span> ·{' '}
            <span className="num">{timings.withinBudget}</span> of{' '}
            <span className="num">{timings.count}</span> under the{' '}
            <span className="num">{timings.budgetMs / 1000}s</span> budget.
          </p>
          <p className="field__hint">Measured on this device. Never sent anywhere.</p>
        </section>
      )}

      <section>
        <h2 className="section-label">Your data</h2>
        <a className="btn btn--quiet btn--block" href="/api/export" download>
          Export everything (JSON)
        </a>
        <p className="field__hint" style={{ marginTop: 'var(--space-2)' }}>
          Every meal, food, weight and setting. No lock-in.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-7)' }}>
        <button
          className="btn btn--ghost btn--block"
          onClick={async () => { await api.logout(); onSignedOut(); }}
        >
          Sign out
        </button>
      </section>
    </main>
  );
}
