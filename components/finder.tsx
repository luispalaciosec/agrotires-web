'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { catHref } from '@/lib/catalog';
import { useSearchNav } from './chrome';
import { Icon } from './ui';

export type FinderTab = 'tire' | 'part' | 'machine';

const OPTIONS: Record<FinderTab, string[]> = {
  tire: ['All agricultural tires', 'Tractor tire', 'Implement tire'],
  part: ['All replacement parts', 'Hydraulics', 'Filters', 'Belts'],
  machine: ['All equipment', 'Tractor', 'Combine', 'Sprayer', 'Planter', 'Implement'],
};
const CAT_LABEL: Record<FinderTab, string> = { tire: 'Tire application', part: 'Part category', machine: 'Equipment type' };
const TERM_LABEL: Record<FinderTab, string> = { tire: 'Tire size or keyword', part: 'Part number or keyword', machine: 'Model or keyword' };
const PLACEHOLDER: Record<FinderTab, string> = { tire: 'e.g. rear tractor tire', part: 'e.g. hydraulic filter', machine: 'e.g. tractor' };
const TABS: [FinderTab, string][] = [['tire', 'Find a tire'], ['part', 'Find a part'], ['machine', 'By machine']];

export function FinderWidget({ initialTab = 'tire' }: { initialTab?: FinderTab }) {
  const [tab, setTab] = useState<FinderTab>(initialTab);
  const router = useRouter();
  const navigateSearch = useSearchNav();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    let q = String(data.get('term') || '').trim();
    const cat = String(data.get('category') || '').toLowerCase();
    if (!q || q.length < 3) {
      if (tab === 'tire') q = 'tire';
      else if (tab === 'part') q = cat.includes('filter') ? 'filter' : cat.includes('belt') ? 'belt' : cat.includes('hydraulic') ? 'hydraulic' : 'part';
      else q = cat.includes('all') ? '' : cat;
    }
    if (tab === 'tire' && q.toLowerCase() === 'tire') router.push(catHref('tires'));
    else if (tab === 'part' && q.toLowerCase() === 'part') router.push(catHref('parts'));
    else navigateSearch(q);
  };

  return (
    <div className="finder-widget">
      <div className="tabs" role="tablist" aria-label="Search type">
        {TABS.map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`} type="button" onClick={() => setTab(id)} role="tab" aria-selected={tab === id}>{label}</button>
        ))}
      </div>
      <form id="finder-form" key={tab} onSubmit={onSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="finder-cat">{CAT_LABEL[tab]}</label>
          <select name="category" className="select-input" id="finder-cat">
            {OPTIONS[tab].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="finder-term">{TERM_LABEL[tab]}</label>
          <input className="text-input" id="finder-term" name="term" placeholder={PLACEHOLDER[tab]} />
        </div>
        <button className="btn btn-block" type="submit">Search sample catalog <Icon name="arrow" size="sm" /></button>
        <p className="fine-print">Preview tool only. Machine fitment and tire compatibility are not verified.</p>
      </form>
    </div>
  );
}

export function FinderSection({ initialTab }: { initialTab?: FinderTab }) {
  return (
    <section className="section finder-section top-offset" id="finder-section">
      <div className="container finder-grid">
        <div className="finder-copy">
          <div className="eyebrow">SMARTER SEARCH STARTS HERE</div>
          <h2 style={{ maxWidth: 440, marginTop: 11 }}>The right solution starts with a better search.</h2>
          <p>Tell us what you&apos;re working with. Browse sample results by tire, part, or equipment type—without navigating a complicated catalog.</p>
          <div className="finder-feature"><Icon name="check" /> Simple, step-by-step discovery</div>
          <div className="finder-feature"><Icon name="check" /> Search by names, categories, and part numbers</div>
          <div className="finder-feature"><Icon name="check" /> Ask for help when you need certainty</div>
        </div>
        <FinderWidget key={initialTab} initialTab={initialTab} />
      </div>
    </section>
  );
}

export function HeroSearch() {
  const navigateSearch = useSearchNav();
  return (
    <div className="search-band">
      <div className="container">
        <form className="search-card" id="hero-search" onSubmit={(e) => { e.preventDefault(); navigateSearch(String(new FormData(e.currentTarget).get('search') || '')); }}>
          <div className="search-label"><strong>What are you looking for?</strong><small>Start your search right here.</small></div>
          <label className="search-field"><Icon name="search" /><input name="search" placeholder="Try 'tractor tire', 'filter', or a part number" aria-label="Search catalog" required /></label>
          <button className="btn" type="submit">Search catalog <Icon name="arrow" size="sm" /></button>
        </form>
      </div>
    </div>
  );
}
