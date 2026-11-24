import { notFound } from 'next/navigation';
import { cache } from 'react';
import { json } from './http';
import { getStore } from './store';

export type StoreMode = 'catalog' | 'shop';

// Catalog unless the team switched selling on. If the setting cannot be read, nothing can be bought.
export const isCatalogMode = cache(async () => {
  try {
    return (await getStore()?.getSetting('store_mode')) !== 'shop';
  } catch {
    return true;
  }
});

// Buying, accounts and order pages do not exist while the site is a catalog.
export async function closedInCatalog() {
  if (await isCatalogMode()) notFound();
}

export async function catalogClosed() {
  return (await isCatalogMode()) ? json({ error: 'Not available' }, 404) : null;
}
