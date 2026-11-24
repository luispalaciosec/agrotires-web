import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { POST as checkout } from '@/app/api/checkout/route';
import { browserProducts } from '@/lib/products';
import { catalogClosed, isCatalogMode } from '@/lib/server/store-mode';
import { getStore } from '@/lib/server/store';

// The real switch, not the online-store stand-in the other tests use.
vi.mock('@/lib/server/store-mode', async (original) => await original());

beforeAll(() => {
  Object.assign(process.env, { STORE_DRIVER: 'local', STORE_FILE: path.join(mkdtempSync(path.join(tmpdir(), 'agrotires-catalog-')), 'store.json') });
});

const buy = () => checkout(new Request('http://localhost:3000/api/checkout', { method: 'POST', body: '{}', headers: { host: 'localhost:3000', origin: 'http://localhost:3000' } }));

describe('catalog mode', () => {
  it('is on until the team turns the store on', async () => {
    expect(await isCatalogMode()).toBe(true);
    expect((await buy()).status).toBe(404);
    expect((await catalogClosed())?.status).toBe(404);
  });

  it('selling opens only when the setting says so', async () => {
    await getStore()!.setSetting('store_mode', 'shop');
    expect(await isCatalogMode()).toBe(false);
    expect(await catalogClosed()).toBeNull();
    expect((await buy()).status).not.toBe(404);
    await getStore()!.setSetting('store_mode', 'catalog');
    expect(await isCatalogMode()).toBe(true);
  });

  it('a setting that cannot be read leaves the site as a catalog', async () => {
    const store = getStore()!;
    const spy = vi.spyOn(Object.getPrototypeOf(store), 'getSetting').mockRejectedValueOnce(new Error('down'));
    expect(await isCatalogMode()).toBe(true);
    spy.mockRestore();
  });

  it('prices never reach the browser', () => {
    const [p] = browserProducts([{ id: 'a', cat: 'c', name: 'n', sku: 's', price: 689, img: 'i', tags: [], desc: 'd', volume: [{ minQty: 5, price: 1 }] }], true);
    expect(p.price).toBe(0);
    expect(p.volume).toBeUndefined();
  });
});
