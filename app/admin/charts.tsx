'use client';

import { useState } from 'react';
import { money } from '@/lib/catalog';

const dayLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// One series in one brand color, so the title names it and no legend is needed.
export function SalesChart({ daily }: { daily: { date: string; cents: number }[] }) {
  const [active, setActive] = useState<number>();
  const max = Math.max(...daily.map((d) => d.cents), 1);
  const point = active === undefined ? undefined : daily[active];
  const ticks = [0, Math.floor((daily.length - 1) / 2), daily.length - 1];
  return (
    <figure className="sales-chart">
      <figcaption className="sales-chart-readout" aria-live="polite">
        {point ? <><strong>{money(point.cents / 100)}</strong> <span>{dayLabel(point.date)}</span></> : <><strong>{money(max === 1 ? 0 : max / 100)}</strong> <span>best day</span></>}
      </figcaption>
      <div className="sales-chart-plot" onMouseLeave={() => setActive(undefined)}>
        {daily.map((d, i) => (
          <button
            type="button"
            className={`sales-bar${i === active ? ' active' : ''}`}
            key={d.date}
            aria-label={`${dayLabel(d.date)}: ${money(d.cents / 100)}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(undefined)}
          >
            <span style={{ height: d.cents ? `max(${(d.cents / max) * 100}%, 3px)` : 0 }} />
          </button>
        ))}
      </div>
      <div className="sales-chart-axis" aria-hidden="true">
        {ticks.map((t) => <span key={t}>{dayLabel(daily[t].date)}</span>)}
      </div>
      <details className="sales-chart-table">
        <summary>View as a table</summary>
        <div className="admin-scroll">
          <table className="admin-table">
            <thead><tr><th>Day (UTC)</th><th>Collected</th></tr></thead>
            <tbody>{daily.filter((d) => d.cents).map((d) => <tr key={d.date}><td>{dayLabel(d.date)}</td><td>{money(d.cents / 100)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
