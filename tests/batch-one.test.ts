import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { POST as checkout } from '@/app/api/checkout/route';
import { POST as quote } from '@/app/api/checkout/quote/route';
import { fitmentMakes, fitmentModels, fitmentToText, fitmentYears, fits, parseFitmentText } from '@/lib/fitment';
import { parseZipRates, shippingStates } from '@/lib/server/rates-input';
import { quoteOrder, shippingCents } from '@/lib/server/checkout';
import { getStore, type ShippingZone, type StoredProduct } from '@/lib/server/store';

let ip = 50;
const post = (url: string, body: unknown) => new Request(`http://localhost:3000${url}`, { method: 'POST', body: JSON.stringify(body), headers: { host: 'localhost:3000', origin: 'http://localhost:3000', 'x-forwarded-for': `10.0.3.${++ip}` } });
const zone = (over: Partial<ShippingZone> = {}): ShippingZone => ({ id: 'z', name: 'Midwest', states: ['IA', 'NE'], baseCents: 1500, perLbCents: 50, active: true, ...over });
const line = (weightLb: number | undefined, quantity = 1, shippingClass: StoredProduct['shippingClass'] = 'parcel') => ({ product: { weightLb, shippingClass } as StoredProduct, quantity });

beforeAll(() => {
  process.env.STORE_DRIVER = 'local';
  process.env.STORE_FILE = path.join(mkdtempSync(path.join(tmpdir(), 'agrotires-one-')), 'store.json');
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ['PAYMENTS_ENABLED', 'PAYPAL_ENV', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET']) delete process.env[k];
});

describe('shipping rates', () => {
  it('adds base plus whole pounds for the zone of the state', () => {
    expect(shippingCents([line(10.2, 2)], 5000, 'IA', [zone()])).toBe(1500 + 21 * 50);
    expect(shippingCents([line(undefined)], 5000, 'NE', [zone()])).toBe(1500);
  });

  it('applies free shipping from the threshold, and to pickup-only orders', () => {
    expect(shippingCents([line(5)], 10000, 'IA', [zone({ freeOverCents: 10000 })])).toBe(0);
    expect(shippingCents([line(5)], 9999, 'IA', [zone({ freeOverCents: 10000 })])).toBe(1750);
    expect(shippingCents([line(50, 1, 'pickup')], 100, 'IA', [zone()])).toBe(0);
  });

  it('a state outside every active zone cannot be shipped to', () => {
    expect(shippingCents([line(1)], 100, 'TX', [zone()])).toBeUndefined();
    expect(shippingCents([line(1)], 100, 'IA', [zone({ active: false })])).toBeUndefined();
  });

  it('with no zones tests add nothing, and live payments refuse', async () => {
    const store = getStore()!;
    const cart = [{ id: 'tire-r1', quantity: 1 }];
    expect((await quoteOrder(store, cart, { state: 'IA' })).shippingCents).toBe(0);
    process.env.PAYPAL_ENV = 'live';
    await expect(quoteOrder(store, cart, { state: 'IA' })).rejects.toThrow('Shipping rates are not set up');
  });

  it('parses the states typed in the panel', () => {
    expect(shippingStates('ia, ne  KS')).toEqual(['IA', 'NE', 'KS']);
    expect(shippingStates('IA, XX')).toBeUndefined();
    expect(shippingStates('')).toBeUndefined();
  });
});

describe('local tax', () => {
  const buy = { items: [{ id: 'tire-r1', quantity: 1 }] };

  it('a ZIP rate wins over the state, shipping is taxed only where set, and the charge matches the preview', async () => {
    Object.assign(process.env, { PAYMENTS_ENABLED: 'true', PAYPAL_ENV: 'sandbox', PAYPAL_CLIENT_ID: 'id', PAYPAL_CLIENT_SECRET: 's' });
    const store = getStore()!;
    await store.saveShippingZones([zone()]);
    await store.saveTaxRates([{ state: 'IA', rateBps: 600, active: true, taxShipping: false }, { state: 'NE', rateBps: 550, active: true, taxShipping: true }]);
    await store.replaceTaxZipRates([{ zip: '50010', rateBps: 700, region: 'Ames' }]);

    const q = async (state: string, zip: string) => (await quote(post('/api/checkout/quote', { ...buy, state, zip }))).json();
    expect(await q('IA', '50011')).toEqual({ subtotalCents: 68900, shippingCents: 1500, taxCents: 4134, totalCents: 74534 });
    expect((await q('IA', '50010')).taxCents).toBe(4823);
    expect((await q('NE', '68001')).taxCents).toBe(Math.round((68900 + 1500) * 0.055));
    const no = await quote(post('/api/checkout/quote', { ...buy, state: 'TX', zip: '75001' }));
    expect(no.status).toBe(400);
    expect((await no.json()).code).toBe('no_shipping');

    vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).endsWith('/oauth2/token') ? Response.json({ access_token: 'T' }) : Response.json({ id: `PP-Z-${Math.random()}` }, { status: 201 }))));
    const made = await (await checkout(post('/api/checkout', { email: 'a@b.test', address: { name: 'A', line1: 'L', city: 'Ames', state: 'IA', postalCode: '50010-1234' }, ...buy }))).json();
    expect(await store.getOrder(made.orderId)).toMatchObject({ shippingCents: 1500, taxCents: 4823, totalCents: 75223 });
    await store.saveShippingZones([]);
    await store.saveTaxRates([]);
    await store.replaceTaxZipRates([]);
  });

  it('imports a rate file and reports bad lines', () => {
    expect(parseZipRates('zip,rate,region\n50010,7,Ames\n"68001",5.5,\n')).toEqual({ ok: true, rates: [{ zip: '50010', rateBps: 700, region: 'Ames' }, { zip: '68001', rateBps: 550, region: undefined }] });
    expect(parseZipRates('zip,rate\n5001,7')).toEqual({ ok: false, error: 'Line 2: the ZIP code must have 5 digits.' });
    expect(parseZipRates('zip,rate\n50010,99')).toEqual({ ok: false, error: 'Line 2: enter a rate from 0 to 20.' });
    expect(parseZipRates('zip,rate\n50010,7\n50010,8')).toEqual({ ok: false, error: 'Line 3: 50010 appears twice.' });
  });
});

describe('machine fitment', () => {
  const list = [
    { make: 'John Deere', model: '6120M', yearFrom: 2015, yearTo: 2020 },
    { make: 'john deere', model: '5075E', yearFrom: 2018, yearTo: 2018 },
    { make: 'Case IH', model: 'Puma 150', yearFrom: 2010, yearTo: 2012 },
  ];

  it('reads the panel format and explains mistakes', () => {
    expect(parseFitmentText('John Deere | 6120M | 2015-2020\n\nCase IH|Puma 150|2010')).toEqual({ ok: true, fitment: [{ make: 'John Deere', model: '6120M', yearFrom: 2015, yearTo: 2020 }, { make: 'Case IH', model: 'Puma 150', yearFrom: 2010, yearTo: 2010 }] });
    expect(parseFitmentText('John Deere, 6120M')).toEqual({ ok: false, error: 'Machine line 1: use Make | Model | 2015-2020.' });
    expect(parseFitmentText('A | B | 2020-2015').ok).toBe(false);
    expect(parseFitmentText('A | B | 2099', 2026).ok).toBe(false);
    expect(parseFitmentText('').ok).toBe(true);
    expect(fitmentToText(list.slice(0, 2))).toBe('John Deere | 6120M | 2015-2020\njohn deere | 5075E | 2018');
  });

  it('matches by make, model and year, ignoring case', () => {
    expect(fits(list, 'JOHN DEERE')).toBe(true);
    expect(fits(list, 'john deere', '6120m', 2016)).toBe(true);
    expect(fits(list, 'John Deere', '6120M', 2021)).toBe(false);
    expect(fits(undefined, 'John Deere')).toBe(false);
  });

  it('builds the choices without repeats', () => {
    expect(fitmentMakes(list)).toHaveLength(2);
    expect(fitmentModels(list, 'John Deere')).toEqual(['5075E', '6120M']);
    expect(fitmentYears(list, 'John Deere', '6120M')).toEqual([2020, 2019, 2018, 2017, 2016, 2015]);
  });

  it('stores per product, and replacing a list leaves others alone', async () => {
    const store = getStore()!;
    await store.saveFitment('a', list.slice(0, 1));
    await store.saveFitment('b', list.slice(1));
    await store.saveFitment('a', []);
    const rows = await store.listFitment();
    expect(rows.filter((r) => r.productId === 'a')).toEqual([]);
    expect(rows.filter((r) => r.productId === 'b')).toHaveLength(2);
    await store.saveFitment('b', []);
  });
});

describe('addresses', () => {
  it('each customer only reaches their own', async () => {
    const store = getStore()!;
    const mine = await store.saveAddress('user-1', { recipient: 'Ana', line1: '1 Farm', city: 'Ames', state: 'IA', postalCode: '50010' });
    await store.deleteAddress('user-2', mine.id);
    expect(await store.listAddresses('user-1')).toHaveLength(1);
    expect(await store.listAddresses('user-2')).toEqual([]);
    await store.deleteAddress('user-1', mine.id);
    expect(await store.listAddresses('user-1')).toEqual([]);
  });

  it('order history matches the profile, and the email only when given', async () => {
    const store = getStore()!;
    const base = { items: [], subtotalCents: 0, shippingCents: 0, taxCents: 0, totalCents: 0, currency: 'USD' as const };
    await store.createOrder({ ...base, email: 'guest@example.test' });
    await store.createOrder({ ...base, email: 'other@example.test', profileId: 'user-9' });
    expect(await store.listCustomerOrders('user-9')).toHaveLength(1);
    expect(await store.listCustomerOrders('user-8')).toHaveLength(0);
    expect(await store.listCustomerOrders('user-8', 'GUEST@example.test')).toHaveLength(1);
  });

  it('greets once per account', async () => {
    const store = getStore()!;
    expect(await store.markWelcomed('user-5')).toBe(true);
    expect(await store.markWelcomed('user-5')).toBe(false);
  });
});
