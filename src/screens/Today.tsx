import { useCallback, useEffect, useState } from 'react';
import { api, type Day, type Me, type Slot } from '../lib/api.ts';
import { Standing, Macros, Micros } from '../components/Standing.tsx';
import { LogSheet } from '../components/LogSheet.tsx';
import { CONFIDENCE_LABEL, SLOT_LABEL, clientId, dayLabel, kcal, timeLabel } from '../lib/format.ts';

function slotForNow(hour: number): Slot {
  if (hour < 10.5) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 17.5) return 'snack';
  if (hour < 22) return 'dinner';
  return 'snack';
}

export function Today({
  me, onOpenSettings, onProfileChanged,
}: {
  me: Me;
  onOpenSettings: () => void;
  onProfileChanged: () => void;
}) {
  const [day, setDay] = useState<Day | null>(null);
  const [date, setDate] = useState(me.today);
  const [logging, setLogging] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (which: string) => {
    try {
      setDay(await api.day(which));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the day.');
    }
  }, []);

  useEffect(() => { void load(date); }, [date, load]);

  // The one moment of motion in the app.
  function celebrate() {
    setJustLogged(true);
    window.setTimeout(() => setJustLogged(false), 900);
  }

  async function addWater(ml: number) {
    if (!day) return;
    setDay({ ...day, water: { ...day.water, ml: day.water.ml + ml } });
    try {
      const res = await api.addWater(ml, clientId());
      setDay((d) => (d ? { ...d, water: { ...d.water, ml: res.ml } } : d));
    } catch {
      void load(date);
    }
  }

  async function removeEntry(id: string) {
    await api.deleteEntry(id);
    void load(date);
  }

  if (error) {
    return (
      <main className="shell">
        <p role="alert" className="banner" style={{ marginTop: 'var(--space-6)' }}>{error}</p>
      </main>
    );
  }

  if (!day) {
    return <main className="shell" aria-busy="true"><p className="quiet" style={{ paddingTop: '4rem' }}>One moment…</p></main>;
  }

  const glasses = Math.round(day.water.targetMl / 250) || 8;
  const filled = Math.round(day.water.ml / 250);

  return (
    <>
      <a className="skip-link" href="#log">Skip to logging</a>

      <main className="shell">
        <header className="topbar">
          <div>
            <h1 className="topbar__date">{dayLabel(day.date, me.today)}</h1>
            <p className="topbar__meta" style={{ margin: 0 }}>
              {day.streak.current > 0
                ? `${day.streak.current} days logged${day.streak.graceUsed ? ' · grace day used' : ''}`
                : 'First day'}
            </p>
          </div>
          <button className="btn btn--ghost" onClick={onOpenSettings} style={{ minHeight: 'auto', padding: 'var(--space-2)' }}>
            Settings
          </button>
        </header>

        <Standing day={day} />
        <Macros day={day} />
        <Micros day={day} />

        <section aria-labelledby="water-heading">
          <h2 id="water-heading" className="section-label">Water</h2>
          <div className="water">
            <span className="water__amount num">
              {(day.water.ml / 1000).toFixed(2)} L
            </span>
            <div className="water__pips" aria-hidden="true">
              {Array.from({ length: glasses }, (_, i) => (
                <span key={i} className="water__pip" data-filled={i < filled} />
              ))}
            </div>
            <button className="btn btn--quiet" onClick={() => addWater(250)}>
              +250 ml
            </button>
          </div>
        </section>

        <section aria-labelledby="entries-heading">
          <h2 id="entries-heading" className="section-label">What you ate</h2>
          {day.entries.length === 0 ? (
            <p className="empty">Nothing logged yet.</p>
          ) : (
            <div className="entries">
              {day.entries.map((entry) => (
                <div key={entry.id} className="entry">
                  <div>
                    <div className="entry__slot">
                      {SLOT_LABEL[entry.slot]} · {timeLabel(entry.eatenAt, day.timezone)}
                    </div>
                    <div className="entry__label">
                      {entry.items.map((i) => i.label).join(' + ')}
                    </div>
                    <div className="entry__sub">
                      <span className="num">{Math.round(entry.totals.protein)}</span> g protein
                      {entry.estimated && (
                        <>
                          {' '}
                          <span className="estimate-tag"
                                data-confidence={entry.items.find((i) => i.estimated)?.confidence}>
                            {CONFIDENCE_LABEL[entry.items.find((i) => i.estimated)?.confidence ?? 'medium']}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="entry__kcal num">{kcal(entry.totals.kcal)}</div>
                    <button className="btn btn--ghost small"
                            style={{ minHeight: 'auto', padding: '4px 0' }}
                            onClick={() => removeEntry(entry.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {!day.isToday && (
          <p style={{ marginTop: 'var(--space-5)' }}>
            <button className="btn btn--quiet btn--block" onClick={() => setDate(me.today)}>
              Back to today
            </button>
          </p>
        )}
      </main>

      <div className="actionbar">
        <div className="actionbar__inner">
          <button id="log" className="btn btn--primary grow" onClick={() => setLogging(true)}>
            Log a meal
          </button>
        </div>
      </div>

      {logging && (
        <LogSheet
          defaultSlot={slotForNow(day.localHour)}
          onClose={() => setLogging(false)}
          onLogged={() => {
            setLogging(false);
            celebrate();
            void load(date);
            onProfileChanged();
          }}
        />
      )}

      {justLogged && (
        <div className="logged-mark" role="status" aria-live="polite">
          <div className="logged-mark__dot">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 13l4.2 4.2L19 7.4" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="visually-hidden">Logged.</span>
        </div>
      )}
    </>
  );
}
