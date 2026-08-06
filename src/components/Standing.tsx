import type { Day } from '../lib/api.ts';
import { kcal, grams } from '../lib/format.ts';

/**
 * The signature view: one screen that answers "where am I right now".
 *
 * The hero is what's left, not what's eaten — that is the number you act on.
 * Under it, the same thing said in food. The bar shows the day filling up, with
 * a tick where a usual day sits at this hour, so pacing is one glance rather
 * than a second chart.
 */
export function Standing({ day }: { day: Day }) {
  const target = day.targets.effective.kcal;
  const consumed = day.consumed.kcal;
  const remaining = day.remaining.kcal;
  const over = remaining < 0;

  const consumedPct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  const overPct = target > 0 && over ? Math.min(40, (-remaining / target) * 100) : 0;
  const tickPct = Math.min(100, day.pace.expectedFraction * 100);

  return (
    <section className="standing" aria-labelledby="standing-heading">
      <h2 id="standing-heading" className="visually-hidden">Where you stand today</h2>

      <div className="standing__figure">
        <span className="standing__number">{kcal(Math.abs(remaining))}</span>
        <span className="standing__unit">{over ? 'over' : 'left'}</span>
      </div>

      <p className="standing__answer">{day.budget.text}</p>

      <p className="standing__of">
        <span className="num">{kcal(consumed)}</span> of{' '}
        <span className="num">{kcal(target)}</span> kcal
      </p>

      <div className="pace">
        <div
          className={`pace__track${over ? ' pace__track--over' : ''}`}
          role="img"
          aria-label={`${Math.round(consumedPct)}% of today's calories. ${day.pace.message}`}
        >
          <div className="pace__fill" style={{ width: `${consumedPct}%` }} />
          {over && <div className="pace__over" style={{ left: '100%', width: `${overPct}%` }} />}
          {day.isToday && <div className="pace__tick" style={{ left: `${tickPct}%` }} />}
        </div>
        <p className="pace__legend">
          <span>{day.pace.message}</span>
        </p>
      </div>
    </section>
  );
}

export function Macros({ day }: { day: Day }) {
  const t = day.targets.effective;
  const c = day.consumed;
  const rows = [
    { name: 'Protein', value: c.protein, target: t.protein, colour: 'var(--macro-protein)', lead: true },
    { name: 'Carbs', value: c.carbs, target: t.carbs, colour: 'var(--macro-carbs)', lead: false },
    { name: 'Fat', value: c.fat, target: t.fat, colour: 'var(--macro-fat)', lead: false },
  ];

  return (
    <section aria-labelledby="macros-heading">
      <h2 id="macros-heading" className="section-label">Macros</h2>
      <div className="macros">
        {rows.map((row) => {
          const pct = row.target > 0 ? Math.min(100, (row.value / row.target) * 100) : 0;
          return (
            <div key={row.name} className={`macro${row.lead ? ' macro--lead' : ''}`}>
              <span className="macro__name">{row.name}</span>
              <span className="macro__value num">
                {grams(row.value)} / {grams(row.target)} g
              </span>
              <div className="macro__track">
                <div className="macro__fill" style={{ width: `${pct}%`, background: row.colour }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Micros({ day }: { day: Day }) {
  const t = day.targets.effective;
  const c = day.consumed;
  const rows = [
    { name: 'Fibre', value: c.fibre, target: t.fibre, unit: 'g', digits: 0 },
    { name: 'Added sugar', value: c.addedSugar, target: t.addedSugar, unit: 'g', digits: 0 },
    { name: 'Saturated fat', value: c.satFat, target: t.satFat, unit: 'g', digits: 0 },
    { name: 'Sodium', value: c.sodium, target: t.sodium, unit: 'mg', digits: 0 },
  ];

  return (
    <section aria-labelledby="micros-heading">
      <h2 id="micros-heading" className="section-label">Also today</h2>
      <div className="micros">
        {rows.map((row) => (
          <div key={row.name}>
            <div className="micro__name">{row.name}</div>
            <div className="micro__value num">
              {grams(row.value, row.digits)}
              <span className="micro__of"> / {grams(row.target, row.digits)} {row.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
