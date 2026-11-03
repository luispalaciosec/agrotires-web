'use client';

import { useState } from 'react';
import { money } from '@/lib/catalog';

const dayLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const compact = (cents: number) => {
  const usd = cents / 100;
  return usd >= 1000 ? `$${(usd / 1000).toFixed(usd >= 10_000 ? 0 : 1)}k` : `$${Math.round(usd)}`;
};

// One series in one color, so the title names it and no legend is needed.
export function SalesChart({ daily }: { daily: { date: string; cents: number }[] }) {
  const [active, setActive] = useState<number>();
  const top = Math.max(...daily.map((d) => d.cents), 1);
  const last = daily.length - 1;
  const x = (i: number) => (last ? (i / last) * 100 : 50);
  const y = (cents: number) => 100 - (cents / top) * 94;
  const line = daily.map((d, i) => `${i ? 'L' : 'M'}${x(i)} ${y(d.cents)}`).join(' ');
  const point = active === undefined ? undefined : daily[active];
  const ticks = [0, Math.floor(last / 2), last];
  return (
    <figure className="area-chart">
      <div className="area-plot" onMouseLeave={() => setActive(undefined)}>
        {[1, 0.5, 0].map((f) => <span className="area-y" key={f} style={{ top: `${y(top * f)}%` }} aria-hidden="true">{compact(top * f)}</span>)}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#3ddba9" stopOpacity=".62" />
              <stop offset="1" stopColor="#3ddba9" stopOpacity=".03" />
            </linearGradient>
          </defs>
          {[1, 0.5, 0].map((f) => <line key={f} className="area-grid" x1="0" x2="100" y1={y(top * f)} y2={y(top * f)} />)}
          <path d={`${line} L100 100 L0 100 Z`} fill="url(#area-fill)" />
          <path className="area-line" d={line} />
          {point ? <line className="area-cross" x1={x(active!)} x2={x(active!)} y1="0" y2="100" /> : null}
        </svg>
        {point ? (
          <>
            <span className="area-dot" style={{ left: `${x(active!)}%`, top: `${y(point.cents)}%` }} />
            <div className="area-tooltip" style={{ left: `clamp(60px, ${x(active!)}%, calc(100% - 60px))` }}><strong>{money(point.cents / 100)}</strong>{dayLabel(point.date)}</div>
          </>
        ) : null}
        <div className="area-hits">
          {daily.map((d, i) => (
            <button
              type="button"
              className="sales-bar"
              key={d.date}
              aria-label={`${dayLabel(d.date)}: ${money(d.cents / 100)}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(undefined)}
            />
          ))}
        </div>
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
