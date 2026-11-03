import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { products as demoProducts, type Product } from '../catalog';
import { SupabaseStore, supabaseConfigured } from './supabase-store';

// Shapes mirror supabase/migrations/0001_store.sql so the database can replace the local driver.
export type OrderStatus = 'pending_payment' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded' | 'payment_failed';
export type OrderItem = { productId: string; sku: string; name: string; unitPriceCents: number; quantity: number };
export type Order = {
  id: string;
  email: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: 'USD';
  paypalOrderId?: string;
  paypalCaptureId?: string;
  createdAt: string;
};
export type QuoteStatus = 'new' | 'in_progress' | 'answered' | 'closed';
export type Quote = { id: string; name: string; email: string; phone?: string; deliveryZip?: string; topic: string; product?: string; message: string; status: QuoteStatus; createdAt: string };
export type ShippingClass = 'parcel' | 'freight_quote' | 'pickup';
// price is null while a product is unpriced; stockQty is null when stock is not tracked.
export type StoredProduct = Omit<Product, 'price'> & {
  price: number | null;
  stockQty: number | null;
  active: boolean;
  shippingClass: ShippingClass;
  compatibilityVerified: boolean;
  weightLb?: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
};

export interface Store {
  saveQuote(q: Omit<Quote, 'id' | 'status' | 'createdAt'>): Promise<Quote>;
  createOrder(o: Omit<Order, 'id' | 'status' | 'createdAt'>): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByPayPalId(paypalOrderId: string): Promise<Order | undefined>;
  updateOrder(id: string, patch: Partial<Pick<Order, 'status' | 'paypalOrderId' | 'paypalCaptureId'>>): Promise<Order>;
  listOrders(): Promise<Order[]>;
  listQuotes(): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote | undefined>;
  updateQuoteStatus(id: string, status: QuoteStatus): Promise<Quote>;
  listProducts(): Promise<StoredProduct[]>;
  saveProducts(list: StoredProduct[]): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  reduceStock(items: OrderItem[]): Promise<void>;
}

type Data = { quotes: Quote[]; orders: Order[]; products: StoredProduct[] };

const seedProducts = (): StoredProduct[] => demoProducts.map((p) => ({ ...p, stockQty: null, active: true, shippingClass: 'parcel', compatibilityVerified: false }));

class LocalFileStore implements Store {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private file: string) {}

  private async read(): Promise<Data> {
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8'));
      return { ...data, products: data.products ?? seedProducts() };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { quotes: [], orders: [], products: seedProducts() };
      throw e;
    }
  }

  // Writes run one at a time so concurrent requests cannot overwrite each other.
  private write<T>(change: (d: Data) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const data = await this.read();
      const result = change(data);
      await mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${randomUUID()}.tmp`;
      await writeFile(tmp, JSON.stringify(data, null, 2));
      await rename(tmp, this.file);
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  saveQuote(q: Omit<Quote, 'id' | 'status' | 'createdAt'>) {
    return this.write((d) => {
      const quote: Quote = { ...q, id: randomUUID(), status: 'new', createdAt: new Date().toISOString() };
      d.quotes.push(quote);
      return quote;
    });
  }

  createOrder(o: Omit<Order, 'id' | 'status' | 'createdAt'>) {
    return this.write((d) => {
      const order: Order = { ...o, id: randomUUID(), status: 'pending_payment', createdAt: new Date().toISOString() };
      d.orders.push(order);
      return order;
    });
  }

  async getOrder(id: string) {
    return (await this.read()).orders.find((o) => o.id === id);
  }

  async getOrderByPayPalId(paypalOrderId: string) {
    return (await this.read()).orders.find((o) => o.paypalOrderId === paypalOrderId);
  }

  updateOrder(id: string, patch: Partial<Pick<Order, 'status' | 'paypalOrderId' | 'paypalCaptureId'>>) {
    return this.write((d) => {
      const order = d.orders.find((o) => o.id === id);
      if (!order) throw new Error('Order not found');
      Object.assign(order, patch);
      return order;
    });
  }

  async listOrders() {
    return (await this.read()).orders.slice().reverse();
  }

  async listQuotes() {
    return (await this.read()).quotes.slice().reverse();
  }

  async getQuote(id: string) {
    return (await this.read()).quotes.find((q) => q.id === id);
  }

  updateQuoteStatus(id: string, status: QuoteStatus) {
    return this.write((d) => {
      const quote = d.quotes.find((q) => q.id === id);
      if (!quote) throw new Error('Quote not found');
      quote.status = status;
      return quote;
    });
  }

  async listProducts() {
    return (await this.read()).products;
  }

  saveProducts(list: StoredProduct[]) {
    return this.write((d) => {
      for (const p of list) {
        const i = d.products.findIndex((x) => x.id === p.id);
        if (i >= 0) d.products[i] = p;
        else d.products.push(p);
      }
    });
  }

  deleteProduct(id: string) {
    return this.write((d) => {
      d.products = d.products.filter((p) => p.id !== id);
    });
  }

  reduceStock(items: OrderItem[]) {
    return this.write((d) => {
      for (const item of items) {
        const p = d.products.find((x) => x.id === item.productId);
        if (p && p.stockQty !== null) p.stockQty = Math.max(0, p.stockQty - item.quantity);
      }
    });
  }
}

let store: Store | undefined;

export function getStore(): Store | undefined {
  if (supabaseConfigured()) {
    store ??= new SupabaseStore();
    return store;
  }
  if (process.env.STORE_DRIVER !== 'local') return undefined;
  store ??= new LocalFileStore(process.env.STORE_FILE || path.join(process.cwd(), '.data', 'store.json'));
  return store;
}
