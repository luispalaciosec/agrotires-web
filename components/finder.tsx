'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { catHref } from '@/lib/catalog';
import { useSearchNav } from './chrome';
import { MachineSearch } from './machine-search';
import { useStore } from './store';
import { Icon } from './ui';

export type FinderTab = 'tire' | 'part' | 'machine';

// Search terms for each option, by position. Tags stay in English in the data,
// and the search also matches each product's name in both languages.
const PART_TERMS = ['part', 'hydraulic', 'filter', 'belt'];
const MACHINE_TERMS = ['', 'tractor', 'combine', 'sprayer', 'planter', 'implement'];

export function FinderWidget({ initialTab = 'tire' }: { initialTab?: FinderTab }) {
  const [tab, setTab] = useState<FinderTab>(initialTab);
  const router = useRouter();
  const navigateSearch = useSearchNav();
  const { t, href, products } = useStore();
  const f = t.finder;
  // With no verified machines yet, this tab keeps the plain search.
  const machineData = tab === 'machine' && products.some((p) => p.fitment?.length);
  const options = tab === 'tire' ? f.optTire : tab === 'part' ? f.optPart : f.optMachine;
  const TABS: [FinderTab, string][] = [['tire', f.tabTire], ['part', f.tabPart], ['machine', f.tabMachine]];

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    let q = String(data.get('term') || '').trim();
    const index = options.indexOf(String(data.get('category') || ''));
    if (!q || q.length < 3) {
      if (tab === 'tire') q = 'tire';
      else if (tab === 'part') q = PART_TERMS[index] ?? 'part';
      else q = MACHINE_TERMS[index] ?? '';
    }
    if (tab === 'tire' && q.toLowerCase() === 'tire') router.push(href(catHref('tires')));
    else if (tab === 'part' && q.toLowerCase() === 'part') router.push(href(catHref('parts')));
    else navigateSearch(q);
  };

  return (
    <div className="finder-widget">
      <div className="tabs" role="tablist" aria-label={f.tabsLabel}>
        {TABS.map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`} type="button" onClick={() => setTab(id)} role="tab" aria-selected={tab === id}>{label}</button>
        ))}
      </div>
      {machineData ? <MachineSearch /> : <form id="finder-form" key={tab} onSubmit={onSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="finder-cat">{tab === 'tire' ? f.catTire : tab === 'part' ? f.catPart : f.catMachine}</label>
          <select name="category" className="select-input" id="finder-cat">
            {options.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="finder-term">{tab === 'tire' ? f.termTire : tab === 'part' ? f.termPart : f.termMachine}</label>
          <input className="text-input" id="finder-term" name="term" placeholder={tab === 'tire' ? f.phTire : tab === 'part' ? f.phPart : f.phMachine} />
        </div>
        <button className="btn btn-block" type="submit">{f.submit} <Icon name="arrow" size="sm" /></button>
        <p className="fine-print">{f.fine}</p>
      </form>}
    </div>
  );
}

export function FinderSection({ initialTab }: { initialTab?: FinderTab }) {
  const f = useStore().t.finder;
  return (
    <section className="section finder-section top-offset" id="finder-section">
      <div className="container finder-grid">
        <div className="finder-copy">
          <div className="eyebrow">{f.eyebrow}</div>
          <h2 style={{ maxWidth: 440, marginTop: 11 }}>{f.title}</h2>
          <p>{f.text}</p>
          <div className="finder-feature"><Icon name="check" /> {f.feature1}</div>
          <div className="finder-feature"><Icon name="check" /> {f.feature2}</div>
          <div className="finder-feature"><Icon name="check" /> {f.feature3}</div>
        </div>
        <FinderWidget key={initialTab} initialTab={initialTab} />
      </div>
    </section>
  );
}

// Reads the browser URL for the same reason as ShopFromUrl. Only for the dynamic finder page:
// on the static home page this hook would remove the section from the server HTML.
export function FinderFromUrl() {
  const tab = useSearchParams().get('tab');
  return <FinderSection initialTab={tab === 'part' || tab === 'machine' ? tab : 'tire'} />;
}

export function HeroSearch() {
  const navigateSearch = useSearchNav();
  const h = useStore().t.home;
  return (
    <div className="search-band">
      <div className="container">
        <form className="search-card" id="hero-search" onSubmit={(e) => { e.preventDefault(); navigateSearch(String(new FormData(e.currentTarget).get('search') || '')); }}>
          <div className="search-label"><strong>{h.searchTitle}</strong><small>{h.searchText}</small></div>
          <label className="search-field"><Icon name="search" /><input name="search" placeholder={h.searchPlaceholder} aria-label={h.searchLabel} required /></label>
          <button className="btn" type="submit">{h.searchBtn} <Icon name="arrow" size="sm" /></button>
        </form>
      </div>
    </div>
  );
}
