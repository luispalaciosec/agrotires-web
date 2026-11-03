import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { products as demoProducts, type Product } from '../catalog';
import type { TemplateContent, TemplateKey } from '../email-templates';
import type { Fitment } from '../fitment';
import type { Locale } from '../i18n';
import type { ShipmentStatus } from '../shipping';
import { PHOTO_EXTENSIONS, type PhotoType } from './photo-upload';
import { SupabaseStore, supabaseConfigured } from './supabase-store';

// Shapes mirror supabase/migrations/0001_store.sql so the database can replace the local driver.
export type OrderStatus = 'pending_payment' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded' | 'payment_failed' | 'on_terms';
export type OrderItem = { productId: string; sku: string; name: string; unitPriceCents: number; quantity: number };
export type ShippingAddress = { name: string; line1: string; line2?: string; city: string; state: string; postalCode: string; country: string };
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
  locale?: Locale;
  shippingAddress?: ShippingAddress;
  refundedCents?: number;
  profileId?: string;
  quoteId?: string;
  payToken?: string;
  payExpiresAt?: string;
  invoiceDueAt?: string;
  invoicePaidAt?: string;
  restocked?: Record<string, number>;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  createdAt: string;
};
export type OrderPatch = Partial<Pick<Order, 'status' | 'paypalOrderId' | 'paypalCaptureId' | 'shippingAddress' | 'refundedCents' | 'payToken' | 'payExpiresAt' | 'invoiceDueAt' | 'invoicePaidAt' | 'restocked'>>;
export type SalesRule = { productId: string; reorderDays?: number; volume: { minQty: number; priceCents: number }[] };
export type B2bStatus = 'pending' | 'approved' | 'rejected';
export type B2bAccount = { profileId: string; email: string; company: string; taxId?: string; note?: string; status: B2bStatus; discountBps: number; termsDays: number; createdAt: string; locale?: string };
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type Review = { id: string; productId: string; orderId: string; rating: number; author: string; body: string; locale?: string; status: ReviewStatus; createdAt: string };
export type Subscriber = { email: string; locale: string; createdAt: string };
export type SavedMachine = { id: string; make: string; model: string; year?: number };
export type Warehouse = { id: string; name: string; active: boolean };
export type StockLevel = { productId: string; warehouseId: string; quantity: number };
export type StockMovement = { id: string; productId: string; warehouseId?: string; delta: number; reason: string; note?: string; actor?: string; createdAt: string };
export type InventorySetting = { productId: string; reorderPoint?: number; supplier?: string };
export type PurchaseOrder = { id: string; supplier: string; warehouseId?: string; status: 'open' | 'received' | 'cancelled'; note?: string; supplierEmail?: string; sentAt?: string; items: { productId: string; sku: string; name: string; quantity: number; unitCostCents: number }[]; createdAt: string; receivedAt?: string };
export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'closed';
export type ReturnItem = { sku: string; quantity: number };
export type ReturnRequest = { id: string; orderId: string; items: ReturnItem[]; reason: string; note?: string; status: ReturnStatus; teamNote?: string; createdAt: string };
export type AuditEntry = { id: string; actor: string; action: string; target?: string; detail?: string; createdAt: string };
export type StoreEvent = { name: string; session: string; productSlug?: string; query?: string; results?: number; locale?: string; createdAt?: string };
export type TeamMember = { email: string; role: string };
export type TaxRate = { state: string; rateBps: number; active: boolean; taxShipping?: boolean };
export type TaxZipRate = { zip: string; rateBps: number; region?: string };
export type ShippingZone = { id: string; name: string; states: string[]; baseCents: number; perLbCents: number; freeOverCents?: number; active: boolean };
export type ProductFitment = Fitment & { productId: string };
export type Address = { id: string; recipient: string; line1: string; line2?: string; city: string; state: string; postalCode: string; phone?: string };
export type StoredTemplate = TemplateContent & { key: TemplateKey; updatedAt?: string };
export type ShipmentEvent = { id: string; status: ShipmentStatus; location?: string; note?: string; occurredAt: string };
export type Shipment = { id: string; orderId: string; code: string; carrier: string; trackingNumber?: string; status: ShipmentStatus; createdAt: string; events: ShipmentEvent[] };
export type QuoteStatus = 'new' | 'in_progress' | 'answered' | 'closed';
export type Quote = { id: string; name: string; email: string; phone?: string; deliveryZip?: string; topic: string; product?: string; message: string; status: QuoteStatus; locale?: Locale; createdAt: string };
export type ShippingClass = 'parcel' | 'freight_quote' | 'pickup';
// price is null while a product is unpriced; stockQty is null when stock is not tracked.
export type StoredProduct = Omit<Product, 'price' | 'alt'> & {
  nameEs?: string;
  descEs?: string;
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
  getOrderByCaptureId(captureId: string): Promise<Order | undefined>;
  updateOrder(id: string, patch: OrderPatch): Promise<Order>;
  listOrders(): Promise<Order[]>;
  listQuotes(): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote | undefined>;
  updateQuoteStatus(id: string, status: QuoteStatus): Promise<Quote>;
  listProducts(): Promise<StoredProduct[]>;
  saveProducts(list: StoredProduct[]): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  uploadImage(bytes: Uint8Array, type: PhotoType): Promise<string>;
  deleteImage(img: string): Promise<void>;
  reduceStock(items: OrderItem[]): Promise<void>;
  restock(items: OrderItem[]): Promise<void>;
  getOrderByPayToken(token: string): Promise<Order | undefined>;
  recordSale(items: OrderItem[], reference: string): Promise<void>;
  adjustStock(change: { productId: string; warehouseId?: string; delta: number; reason: string; note?: string; actor?: string }): Promise<void>;
  listWarehouses(): Promise<Warehouse[]>;
  addWarehouse(name: string): Promise<Warehouse>;
  listStockLevels(): Promise<StockLevel[]>;
  listMovements(limit: number): Promise<StockMovement[]>;
  listInventorySettings(): Promise<InventorySetting[]>;
  saveInventorySetting(setting: InventorySetting): Promise<void>;
  listPurchaseOrders(): Promise<PurchaseOrder[]>;
  createPurchaseOrder(po: Pick<PurchaseOrder, 'supplier' | 'supplierEmail' | 'warehouseId' | 'note' | 'items'>): Promise<PurchaseOrder>;
  markPurchaseOrderSent(id: string): Promise<void>;
  addSubscriber(email: string, locale: string): Promise<void>;
  listSubscribers(): Promise<Subscriber[]>;
  getWishlist(profileId: string): Promise<string[]>;
  setWishlist(profileId: string, items: string[]): Promise<void>;
  listMachines(profileId: string): Promise<SavedMachine[]>;
  saveMachine(profileId: string, machine: Omit<SavedMachine, 'id'>): Promise<SavedMachine>;
  deleteMachine(profileId: string, id: string): Promise<void>;
  markPurchaseOrderReceived(id: string): Promise<PurchaseOrder | undefined>;
  createReturn(r: Pick<ReturnRequest, 'orderId' | 'items' | 'reason' | 'note'>): Promise<ReturnRequest>;
  listReturns(): Promise<ReturnRequest[]>;
  listReturnsForOrder(orderId: string): Promise<ReturnRequest[]>;
  getReturn(id: string): Promise<ReturnRequest | undefined>;
  updateReturn(id: string, status: ReturnStatus, teamNote?: string): Promise<void>;
  addAudit(entry: Pick<AuditEntry, 'actor' | 'action' | 'target' | 'detail'>): Promise<void>;
  listAudit(limit: number): Promise<AuditEntry[]>;
  listTeam(): Promise<TeamMember[]>;
  setRole(email: string, role: 'customer' | 'staff' | 'admin'): Promise<boolean>;
  addEvent(event: StoreEvent): Promise<void>;
  listEvents(since: string): Promise<StoreEvent[]>;
  purgeEvents(before: string): Promise<void>;
  listSalesRules(): Promise<SalesRule[]>;
  saveSalesRule(rule: SalesRule): Promise<void>;
  getB2bAccount(profileId: string): Promise<B2bAccount | undefined>;
  listB2bAccounts(): Promise<B2bAccount[]>;
  saveB2bAccount(account: B2bAccount): Promise<void>;
  listReviews(): Promise<Review[]>;
  listApprovedReviews(productId: string): Promise<Review[]>;
  saveReview(review: Pick<Review, 'productId' | 'orderId' | 'rating' | 'author' | 'body' | 'locale'>): Promise<void>;
  moderateReview(id: string, status: ReviewStatus): Promise<void>;
  isOptedOut(email: string): Promise<boolean>;
  optOut(email: string): Promise<void>;
  claimReminder(key: string): Promise<boolean>;
  listShippingZones(): Promise<ShippingZone[]>;
  saveShippingZones(zones: ShippingZone[]): Promise<void>;
  getTaxZipRate(zip: string): Promise<TaxZipRate | undefined>;
  countTaxZipRates(): Promise<number>;
  replaceTaxZipRates(rates: TaxZipRate[]): Promise<void>;
  listFitment(): Promise<ProductFitment[]>;
  saveFitment(productId: string, fitment: Fitment[]): Promise<void>;
  listAddresses(profileId: string): Promise<Address[]>;
  saveAddress(profileId: string, address: Omit<Address, 'id'>): Promise<Address>;
  deleteAddress(profileId: string, id: string): Promise<void>;
  listCustomerOrders(profileId: string, email?: string): Promise<Order[]>;
  markWelcomed(profileId: string): Promise<boolean>;
  listTaxRates(): Promise<TaxRate[]>;
  saveTaxRates(rates: TaxRate[]): Promise<void>;
  listEmailTemplates(): Promise<StoredTemplate[]>;
  saveEmailTemplate(template: StoredTemplate): Promise<void>;
  deleteEmailTemplate(key: TemplateKey): Promise<void>;
  listShipments(): Promise<Shipment[]>;
  getShipmentByOrder(orderId: string): Promise<Shipment | undefined>;
  getShipmentByCode(code: string): Promise<Shipment | undefined>;
  createShipment(s: { orderId: string; code: string; carrier: string; trackingNumber?: string }): Promise<Shipment>;
  addShipmentEvent(shipmentId: string, e: { status: ShipmentStatus; location?: string; note?: string }): Promise<Shipment>;
}

type Data = { quotes: Quote[]; orders: Order[]; products: StoredProduct[]; taxRates: TaxRate[]; templates: StoredTemplate[]; shipments: Shipment[]; zones: ShippingZone[]; zipRates: TaxZipRate[]; fitment: ProductFitment[]; addresses: (Address & { profileId: string })[]; welcomed: string[]; rules: SalesRule[]; b2b: B2bAccount[]; reviews: Review[]; optouts: string[]; reminders: string[]; warehouses: Warehouse[]; levels: StockLevel[]; movements: StockMovement[]; settings: InventorySetting[]; purchases: PurchaseOrder[]; returns: ReturnRequest[]; audit: AuditEntry[]; events: StoreEvent[]; subscribers: Subscriber[]; wishlists: Record<string, string[]>; machines: (SavedMachine & { profileId: string })[] };

const seedProducts = (): StoredProduct[] => demoProducts.map((p) => ({ ...p, stockQty: null, active: true, shippingClass: 'parcel', compatibilityVerified: false }));

class LocalFileStore implements Store {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private file: string) {}

  private async read(): Promise<Data> {
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8'));
      return { taxRates: [], templates: [], shipments: [], zones: [], zipRates: [], fitment: [], addresses: [], welcomed: [], rules: [], b2b: [], reviews: [], optouts: [], reminders: [], warehouses: [], levels: [], movements: [], settings: [], purchases: [], returns: [], audit: [], events: [], subscribers: [], wishlists: {}, machines: [], ...data, products: data.products ?? seedProducts() };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { quotes: [], orders: [], products: seedProducts(), taxRates: [], templates: [], shipments: [], zones: [], zipRates: [], fitment: [], addresses: [], welcomed: [], rules: [], b2b: [], reviews: [], optouts: [], reminders: [], warehouses: [], levels: [], movements: [], settings: [], purchases: [], returns: [], audit: [], events: [], subscribers: [], wishlists: {}, machines: [] };
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

  updateOrder(id: string, patch: OrderPatch) {
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

  async uploadImage(bytes: Uint8Array, type: PhotoType) {
    const name = `${randomUUID()}.${PHOTO_EXTENSIONS[type]}`;
    const dir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);
    return `/uploads/${name}`;
  }

  async deleteImage(img: string) {
    if (img.startsWith('/uploads/')) await rm(path.join(process.cwd(), 'public', 'uploads', path.basename(img)), { force: true });
  }

  recordSale(items: OrderItem[], reference: string) {
    return this.write((d) => {
      for (const item of items) {
        const p = d.products.find((x) => x.id === item.productId);
        if (!p || p.stockQty === null) continue;
        p.stockQty = Math.max(0, p.stockQty - item.quantity);
        const source = d.levels.filter((l) => l.productId === p.id).sort((a, b) => b.quantity - a.quantity)[0];
        if (source) source.quantity = Math.max(0, source.quantity - item.quantity);
        d.movements.push({ id: randomUUID(), productId: p.id, warehouseId: source?.warehouseId, delta: -item.quantity, reason: 'sale', note: reference, createdAt: new Date().toISOString() });
      }
    });
  }

  adjustStock(c: { productId: string; warehouseId?: string; delta: number; reason: string; note?: string; actor?: string }) {
    return this.write((d) => {
      const p = d.products.find((x) => x.id === c.productId);
      if (!p) throw new Error('Unknown product');
      if (c.warehouseId) {
        let level = d.levels.find((l) => l.productId === c.productId && l.warehouseId === c.warehouseId);
        if (!level) {
          level = { productId: c.productId, warehouseId: c.warehouseId, quantity: 0 };
          d.levels.push(level);
        }
        level.quantity = Math.max(0, level.quantity + c.delta);
      }
      p.stockQty = Math.max(0, (p.stockQty ?? 0) + c.delta);
      d.movements.push({ ...c, id: randomUUID(), createdAt: new Date().toISOString() });
    });
  }

  async listWarehouses() {
    return (await this.read()).warehouses;
  }

  addWarehouse(name: string) {
    return this.write((d) => {
      const w: Warehouse = { id: randomUUID(), name, active: true };
      d.warehouses.push(w);
      return w;
    });
  }

  async listStockLevels() {
    return (await this.read()).levels;
  }

  async listMovements(limit: number) {
    return (await this.read()).movements.slice().reverse().slice(0, limit);
  }

  async listInventorySettings() {
    return (await this.read()).settings;
  }

  saveInventorySetting(s: InventorySetting) {
    return this.write((d) => {
      d.settings = [...d.settings.filter((x) => x.productId !== s.productId), s];
    });
  }

  async listPurchaseOrders() {
    return (await this.read()).purchases.slice().reverse();
  }

  markPurchaseOrderSent(id: string) {
    return this.write((d) => {
      const po = d.purchases.find((x) => x.id === id);
      if (po) po.sentAt = new Date().toISOString();
    });
  }

  addSubscriber(email: string, locale: string) {
    const lower = email.toLowerCase();
    return this.write((d) => {
      d.optouts = d.optouts.filter((e) => e !== lower);
      if (!d.subscribers.some((s) => s.email === lower)) d.subscribers.push({ email: lower, locale, createdAt: new Date().toISOString() });
    });
  }

  async listSubscribers() {
    const d = await this.read();
    return d.subscribers.filter((s) => !d.optouts.includes(s.email));
  }

  async getWishlist(profileId: string) {
    return (await this.read()).wishlists[profileId] ?? [];
  }

  setWishlist(profileId: string, items: string[]) {
    return this.write((d) => {
      d.wishlists[profileId] = [...new Set(items)];
    });
  }

  async listMachines(profileId: string) {
    return (await this.read()).machines.filter((m) => m.profileId === profileId).map(({ profileId: _, ...m }) => m);
  }

  saveMachine(profileId: string, machine: Omit<SavedMachine, 'id'>) {
    return this.write((d) => {
      const saved = { ...machine, id: randomUUID() };
      d.machines.push({ ...saved, profileId });
      return saved;
    });
  }

  deleteMachine(profileId: string, id: string) {
    return this.write((d) => {
      d.machines = d.machines.filter((m) => !(m.id === id && m.profileId === profileId));
    });
  }

  createPurchaseOrder(po: Pick<PurchaseOrder, 'supplier' | 'supplierEmail' | 'warehouseId' | 'note' | 'items'>) {
    return this.write((d) => {
      const saved: PurchaseOrder = { ...po, id: randomUUID(), status: 'open', createdAt: new Date().toISOString() };
      d.purchases.push(saved);
      return saved;
    });
  }

  markPurchaseOrderReceived(id: string) {
    return this.write((d) => {
      const po = d.purchases.find((x) => x.id === id);
      if (!po || po.status !== 'open') return undefined;
      po.status = 'received';
      po.receivedAt = new Date().toISOString();
      return po;
    });
  }

  createReturn(r: Pick<ReturnRequest, 'orderId' | 'items' | 'reason' | 'note'>) {
    return this.write((d) => {
      const saved: ReturnRequest = { ...r, id: randomUUID(), status: 'requested', createdAt: new Date().toISOString() };
      d.returns.push(saved);
      return saved;
    });
  }

  async listReturns() {
    return (await this.read()).returns.slice().reverse();
  }

  async listReturnsForOrder(orderId: string) {
    return (await this.read()).returns.filter((r) => r.orderId === orderId);
  }

  async getReturn(id: string) {
    return (await this.read()).returns.find((r) => r.id === id);
  }

  updateReturn(id: string, status: ReturnStatus, teamNote?: string) {
    return this.write((d) => {
      const r = d.returns.find((x) => x.id === id);
      if (r) Object.assign(r, { status, ...(teamNote ? { teamNote } : {}) });
    });
  }

  addAudit(e: Pick<AuditEntry, 'actor' | 'action' | 'target' | 'detail'>) {
    return this.write((d) => {
      d.audit.push({ ...e, id: randomUUID(), createdAt: new Date().toISOString() });
    });
  }

  async listAudit(limit: number) {
    return (await this.read()).audit.slice().reverse().slice(0, limit);
  }

  async listTeam(): Promise<TeamMember[]> {
    return [];
  }

  async setRole() {
    return false;
  }

  addEvent(e: StoreEvent) {
    return this.write((d) => {
      d.events.push({ ...e, createdAt: new Date().toISOString() });
    });
  }

  async listEvents(since: string) {
    return (await this.read()).events.filter((e) => (e.createdAt ?? '') >= since);
  }

  purgeEvents(before: string) {
    return this.write((d) => {
      d.events = d.events.filter((e) => (e.createdAt ?? '') >= before);
    });
  }

  async getOrderByPayToken(token: string) {
    return (await this.read()).orders.find((o) => o.payToken === token);
  }

  async listSalesRules() {
    return (await this.read()).rules;
  }

  saveSalesRule(rule: SalesRule) {
    return this.write((d) => {
      d.rules = [...d.rules.filter((r) => r.productId !== rule.productId), rule];
    });
  }

  async getB2bAccount(profileId: string) {
    return (await this.read()).b2b.find((a) => a.profileId === profileId);
  }

  async listB2bAccounts() {
    return (await this.read()).b2b.slice().reverse();
  }

  saveB2bAccount(account: B2bAccount) {
    return this.write((d) => {
      d.b2b = [...d.b2b.filter((a) => a.profileId !== account.profileId), account];
    });
  }

  async listReviews() {
    return (await this.read()).reviews.slice().reverse();
  }

  async listApprovedReviews(productId: string) {
    return (await this.read()).reviews.filter((r) => r.productId === productId && r.status === 'approved').reverse();
  }

  saveReview(review: Pick<Review, 'productId' | 'orderId' | 'rating' | 'author' | 'body' | 'locale'>) {
    return this.write((d) => {
      if (d.reviews.some((r) => r.orderId === review.orderId && r.productId === review.productId)) throw new Error('Already reviewed');
      d.reviews.push({ ...review, id: randomUUID(), status: 'pending', createdAt: new Date().toISOString() });
    });
  }

  moderateReview(id: string, status: ReviewStatus) {
    return this.write((d) => {
      const review = d.reviews.find((r) => r.id === id);
      if (review) review.status = status;
    });
  }

  async isOptedOut(email: string) {
    return (await this.read()).optouts.includes(email.toLowerCase());
  }

  optOut(email: string) {
    return this.write((d) => {
      if (!d.optouts.includes(email.toLowerCase())) d.optouts.push(email.toLowerCase());
    });
  }

  claimReminder(key: string) {
    return this.write((d) => {
      if (d.reminders.includes(key)) return false;
      d.reminders.push(key);
      return true;
    });
  }

  async listShippingZones() {
    return (await this.read()).zones;
  }

  saveShippingZones(zones: ShippingZone[]) {
    return this.write((d) => {
      d.zones = zones;
    });
  }

  async getTaxZipRate(zip: string) {
    return (await this.read()).zipRates.find((r) => r.zip === zip);
  }

  async countTaxZipRates() {
    return (await this.read()).zipRates.length;
  }

  replaceTaxZipRates(rates: TaxZipRate[]) {
    return this.write((d) => {
      d.zipRates = rates;
    });
  }

  async listFitment() {
    return (await this.read()).fitment;
  }

  saveFitment(productId: string, fitment: Fitment[]) {
    return this.write((d) => {
      d.fitment = [...d.fitment.filter((f) => f.productId !== productId), ...fitment.map((f) => ({ ...f, productId }))];
    });
  }

  async listAddresses(profileId: string) {
    return (await this.read()).addresses.filter((a) => a.profileId === profileId).map(({ profileId: _, ...a }) => a);
  }

  saveAddress(profileId: string, address: Omit<Address, 'id'>) {
    return this.write((d) => {
      const saved = { ...address, id: randomUUID() };
      d.addresses.push({ ...saved, profileId });
      return saved;
    });
  }

  deleteAddress(profileId: string, id: string) {
    return this.write((d) => {
      d.addresses = d.addresses.filter((a) => !(a.id === id && a.profileId === profileId));
    });
  }

  async listCustomerOrders(profileId: string, email?: string) {
    const lower = email?.toLowerCase();
    return (await this.read()).orders.filter((o) => o.profileId === profileId || (lower && o.email.toLowerCase() === lower)).reverse();
  }

  markWelcomed(profileId: string) {
    return this.write((d) => {
      if (d.welcomed.includes(profileId)) return false;
      d.welcomed.push(profileId);
      return true;
    });
  }

  async listTaxRates() {
    return (await this.read()).taxRates;
  }

  saveTaxRates(rates: TaxRate[]) {
    return this.write((d) => {
      d.taxRates = rates;
    });
  }

  async listEmailTemplates() {
    return (await this.read()).templates;
  }

  saveEmailTemplate(template: StoredTemplate) {
    return this.write((d) => {
      d.templates = [...d.templates.filter((t) => t.key !== template.key), { ...template, updatedAt: new Date().toISOString() }];
    });
  }

  deleteEmailTemplate(key: TemplateKey) {
    return this.write((d) => {
      d.templates = d.templates.filter((t) => t.key !== key);
    });
  }

  async listShipments() {
    return (await this.read()).shipments.slice().reverse();
  }

  async getShipmentByOrder(orderId: string) {
    return (await this.read()).shipments.find((s) => s.orderId === orderId);
  }

  async getShipmentByCode(code: string) {
    return (await this.read()).shipments.find((s) => s.code === code);
  }

  createShipment(s: { orderId: string; code: string; carrier: string; trackingNumber?: string }) {
    return this.write((d) => {
      if (d.shipments.some((x) => x.orderId === s.orderId)) throw new Error('This order already has a shipment');
      const now = new Date().toISOString();
      const shipment: Shipment = { ...s, id: randomUUID(), status: 'label_created', createdAt: now, events: [{ id: randomUUID(), status: 'label_created', occurredAt: now }] };
      d.shipments.push(shipment);
      return shipment;
    });
  }

  addShipmentEvent(shipmentId: string, e: { status: ShipmentStatus; location?: string; note?: string }) {
    return this.write((d) => {
      const shipment = d.shipments.find((s) => s.id === shipmentId);
      if (!shipment) throw new Error('Shipment not found');
      shipment.events.push({ ...e, id: randomUUID(), occurredAt: new Date().toISOString() });
      shipment.status = e.status;
      return shipment;
    });
  }

  restock(items: OrderItem[]) {
    return this.write((d) => {
      for (const item of items) {
        const p = d.products.find((x) => x.id === item.productId);
        if (p && p.stockQty !== null) p.stockQty += item.quantity;
      }
    });
  }

  async getOrderByCaptureId(captureId: string) {
    return (await this.read()).orders.find((o) => o.paypalCaptureId === captureId);
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
