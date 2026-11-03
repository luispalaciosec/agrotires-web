'use client';

import { useEffect, useMemo, useState } from 'react';
import { fitmentMakes, fitmentModels, fitmentYears, fits } from '@/lib/fitment';
import { ProductCard } from './product';
import { useStore } from './store';

// Only products whose fitment the business verified carry this data.
export function MachineSearch() {
  const { products, t } = useStore();
  const f = t.finder;
  const all = useMemo(() => products.flatMap((p) => p.fitment ?? []), [products]);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  // A saved machine in the account links here with its details.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const wanted = q.get('make')?.toLowerCase();
    const foundMake = wanted && fitmentMakes(all).find((m) => m.toLowerCase() === wanted);
    if (!foundMake) return;
    setMake(foundMake);
    const wantedModel = q.get('model')?.toLowerCase();
    const foundModel = wantedModel && fitmentModels(all, foundMake).find((m) => m.toLowerCase() === wantedModel);
    if (!foundModel) return;
    setModel(foundModel);
    const y = q.get('year');
    if (y && fitmentYears(all, foundMake, foundModel).includes(Number(y))) setYear(y);
  }, [all]);
  const results = make ? products.filter((p) => fits(p.fitment, make, model || undefined, year ? Number(year) : undefined)) : [];
  return (
    <div className="machine-search">
      <div className="field">
        <label className="field-label" htmlFor="machine-make">{f.machineMake}</label>
        <select id="machine-make" className="select-input" value={make} onChange={(e) => { setMake(e.target.value); setModel(''); setYear(''); }}>
          <option value="">{f.machineChoose}</option>
          {fitmentMakes(all).map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="machine-model">{f.machineModel}</label>
        <select id="machine-model" className="select-input" value={model} disabled={!make} onChange={(e) => { setModel(e.target.value); setYear(''); }}>
          <option value="">{f.machineAny}</option>
          {make ? fitmentModels(all, make).map((m) => <option key={m}>{m}</option>) : null}
        </select>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="machine-year">{f.machineYear}</label>
        <select id="machine-year" className="select-input" value={year} disabled={!model} onChange={(e) => setYear(e.target.value)}>
          <option value="">{f.machineAny}</option>
          {model ? fitmentYears(all, make, model).map((y) => <option key={y}>{y}</option>) : null}
        </select>
      </div>
      <p className="fine-print">{f.machineVerified}</p>
      {make ? (
        <div className="machine-results" role="status">
          <strong>{f.machineResults(results.length)}</strong>
          <div className="machine-grid">{results.slice(0, 6).map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </div>
      ) : null}
    </div>
  );
}
