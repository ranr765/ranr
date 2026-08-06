import { useEffect, useRef, useState } from 'react';
import { api, type Repeat, type Slot } from '../lib/api.ts';
import { SLOT_LABEL, clientId, kcal } from '../lib/format.ts';
import { markLogged, markLogStart } from '../lib/benchmark.ts';

const SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface Draft {
  label: string;
  qty: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  fibre: string;
  addedSugar: string;
  satFat: string;
  sodium: string;
}

const EMPTY: Draft = {
  label: '', qty: '1', kcal: '', protein: '',
  carbs: '', fat: '', fibre: '', addedSugar: '', satFat: '', sodium: '',
};

const n = (v: string) => (v.trim() === '' ? 0 : Number(v));

export function LogSheet({
  defaultSlot, onClose, onLogged,
}: {
  defaultSlot: Slot;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [slot, setSlot] = useState<Slot>(defaultSlot);
  const [items, setItems] = useState<Draft[]>([{ ...EMPTY }]);
  const [detail, setDetail] = useState(false);
  const [repeats, setRepeats] = useState<Repeat[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markLogStart();
    firstField.current?.focus();
    api.repeats().then((r) => setRepeats(r.repeats)).catch(() => {});
  }, []);

  // Escape closes, and focus stays inside while it is open.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !sheet.current) return;
      const focusable = sheet.current.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function update(index: number, patch: Partial<Draft>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  const total = items.reduce((sum, item) => sum + n(item.kcal) * n(item.qty || '1'), 0);
  const canSave = items.some((item) => item.label.trim() !== '');

  async function logRepeat(repeat: Repeat) {
    setBusy(true);
    try {
      const detailed = await api.repeatItems(repeat.entryId);
      await api.logEntry({
        clientId: clientId(),
        slot: repeat.slot,
        source: 'repeat',
        items: detailed.items.map((item) => ({
          label: item.label, qty: item.qty, unit: item.unit, foodId: item.foodId ?? undefined,
          kcal: item.kcal, protein: item.protein, carbs: item.carbs, fat: item.fat,
          fibre: item.fibre, addedSugar: item.addedSugar, satFat: item.satFat, sodium: item.sodium,
          estimated: item.estimated, confidence: item.confidence,
        })),
      });
      markLogged();
      onLogged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save.');
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.logEntry({
        clientId: clientId(),
        slot,
        source: 'manual',
        items: items
          .filter((item) => item.label.trim() !== '')
          .map((item) => {
            const qty = n(item.qty || '1') || 1;
            // Per-unit values are entered; totals are what gets stored.
            return {
              label: item.label.trim(),
              qty,
              kcal: n(item.kcal) * qty,
              protein: n(item.protein) * qty,
              carbs: n(item.carbs) * qty,
              fat: n(item.fat) * qty,
              fibre: n(item.fibre) * qty,
              addedSugar: n(item.addedSugar) * qty,
              satFat: n(item.satFat) * qty,
              sodium: n(item.sodium) * qty,
              estimated: false,
              confidence: 'measured',
            };
          }),
      });
      markLogged();
      onLogged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save.');
      setBusy(false);
    }
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        className="sheet" ref={sheet}
        role="dialog" aria-modal="true" aria-label="Log a meal"
      >
        <div className="sheet__inner">
          <div className="sheet__grip" />

          <div className="sheet__head">
            <h2 style={{ fontSize: 'var(--step-2)' }}>Log a meal</h2>
            <button className="btn btn--ghost" onClick={onClose}>Close</button>
          </div>

          {repeats.length > 0 && (
            <section style={{ marginBottom: 'var(--space-5)' }}>
              <h3 className="section-label">Again</h3>
              <div className="repeats">
                {repeats.map((repeat) => (
                  <button
                    key={repeat.key} className="repeat" disabled={busy}
                    onClick={() => logRepeat(repeat)}
                  >
                    <span className="repeat__label">{repeat.labels}</span>
                    <span className="repeat__meta num">
                      {kcal(repeat.kcal)} kcal · {SLOT_LABEL[repeat.slot]}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <fieldset style={{ border: 0, padding: 0, margin: '0 0 var(--space-4)' }}>
            <legend className="visually-hidden">Meal</legend>
            <div className="choice-row">
              {SLOTS.map((s) => (
                <button key={s} type="button" className="choice"
                        aria-pressed={slot === s} onClick={() => setSlot(s)}>
                  {SLOT_LABEL[s]}
                </button>
              ))}
            </div>
          </fieldset>

          {items.map((item, index) => (
            <div key={index} className="stack" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="field__label" htmlFor={`label-${index}`}>What</label>
                <input
                  id={`label-${index}`} className="input"
                  ref={index === 0 ? firstField : undefined}
                  placeholder="Idli with sambar"
                  value={item.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                />
              </div>

              <div className="row" style={{ gap: 'var(--space-2)' }}>
                <div className="field grow" style={{ marginBottom: 0 }}>
                  <label className="field__label" htmlFor={`qty-${index}`}>Qty</label>
                  <input id={`qty-${index}`} className="input input--num" type="number"
                         inputMode="decimal" step="0.5" min="0" value={item.qty}
                         onChange={(e) => update(index, { qty: e.target.value })} />
                </div>
                <div className="field grow" style={{ marginBottom: 0 }}>
                  <label className="field__label" htmlFor={`kcal-${index}`}>kcal each</label>
                  <input id={`kcal-${index}`} className="input input--num" type="number"
                         inputMode="numeric" min="0" value={item.kcal}
                         onChange={(e) => update(index, { kcal: e.target.value })} />
                </div>
                <div className="field grow" style={{ marginBottom: 0 }}>
                  <label className="field__label" htmlFor={`protein-${index}`}>Protein</label>
                  <input id={`protein-${index}`} className="input input--num" type="number"
                         inputMode="decimal" min="0" step="0.1" value={item.protein}
                         onChange={(e) => update(index, { protein: e.target.value })} />
                </div>
              </div>

              {detail && (
                <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {([
                    ['carbs', 'Carbs g'], ['fat', 'Fat g'], ['fibre', 'Fibre g'],
                    ['addedSugar', 'Added sugar g'], ['satFat', 'Sat fat g'], ['sodium', 'Sodium mg'],
                  ] as Array<[keyof Draft, string]>).map(([key, label]) => (
                    <div key={key} className="field" style={{ marginBottom: 0, minWidth: '5.5rem', flex: 1 }}>
                      <label className="field__label" htmlFor={`${key}-${index}`}>{label}</label>
                      <input id={`${key}-${index}`} className="input input--num" type="number"
                             inputMode="decimal" min="0" step="0.1" value={item[key]}
                             onChange={(e) => update(index, { [key]: e.target.value } as Partial<Draft>)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="row" style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            <button className="btn btn--quiet" onClick={() => setItems((p) => [...p, { ...EMPTY }])}>
              Add another
            </button>
            <button className="btn btn--ghost" onClick={() => setDetail((d) => !d)}
                    aria-expanded={detail}>
              {detail ? 'Fewer fields' : 'More fields'}
            </button>
          </div>

          {error && <p role="alert" className="banner" style={{ marginBottom: 'var(--space-4)' }}>{error}</p>}

          <button className="btn btn--primary btn--block" onClick={save} disabled={!canSave || busy}>
            {busy ? 'Saving…' : total > 0 ? `Log ${kcal(total)} kcal` : 'Log it'}
          </button>
        </div>
      </div>
    </>
  );
}
