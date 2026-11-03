'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import type { ReturnStatus } from '@/lib/server/store';
import { addWarehouseAction, adjustStockAction, createPurchaseOrderAction, setRoleAction, updateReturnAction, type FormState } from './actions';
import { Messages } from './forms';

const empty: FormState = {};
const submitWith = (action: (data: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  startTransition(() => action(data));
};

type Option = { id: string; name: string };

const WarehouseSelect = ({ warehouses, label }: { warehouses: Option[]; label: string }) => (
  <div className="field">
    <label className="field-label" htmlFor="warehouse">{label}</label>
    <select className="select-input" id="warehouse" name="warehouse" defaultValue={warehouses[0]?.id ?? ''}>
      <option value="">No specific warehouse</option>
      {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
    </select>
  </div>
);

export function StockAdjustForm({ products, warehouses }: { products: { id: string; label: string }[]; warehouses: Option[] }) {
  const [state, action, pending] = useActionState(adjustStockAction, empty);
  return (
    <form key={state.notice} onSubmit={submitWith(action)}>
      <Messages state={state} />
      <div className="field">
        <label className="field-label" htmlFor="product">Product *</label>
        <select className="select-input" id="product" name="product" required defaultValue=""><option value="" disabled>Choose a product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
      </div>
      <WarehouseSelect warehouses={warehouses} label="Warehouse" />
      <div className="form-grid">
        <div className="field"><label className="field-label" htmlFor="delta">Change, such as 10 or -3 *</label><input className="text-input" id="delta" name="delta" inputMode="numeric" required /></div>
        <div className="field"><label className="field-label" htmlFor="reason">Reason *</label><select className="select-input" id="reason" name="reason" defaultValue="count"><option value="count">Stock count</option><option value="received">Received</option><option value="damaged">Damaged</option><option value="return">Customer return</option><option value="other">Other</option></select></div>
        <div className="field full-width"><label className="field-label" htmlFor="note">Note</label><input className="text-input" id="note" name="note" maxLength={200} /></div>
        <div className="field"><label className="field-label" htmlFor="reorderPoint">Alert when at or below</label><input className="text-input" id="reorderPoint" name="reorderPoint" inputMode="numeric" placeholder="Unchanged" /></div>
        <div className="field"><label className="field-label" htmlFor="supplier">Supplier</label><input className="text-input" id="supplier" name="supplier" maxLength={120} placeholder="Unchanged" /></div>
      </div>
      <div className="admin-actions"><button className="btn" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button></div>
    </form>
  );
}

export function AddWarehouseForm() {
  const [state, action, pending] = useActionState(addWarehouseAction, empty);
  return (
    <form key={state.notice} onSubmit={submitWith(action)}>
      <Messages state={state} />
      <div className="track-row">
        <input className="text-input" name="name" placeholder="Warehouse name" aria-label="Warehouse name" maxLength={80} required />
        <button className="btn btn-light" disabled={pending}>Add</button>
      </div>
    </form>
  );
}

export function PurchaseOrderForm({ warehouses }: { warehouses: Option[] }) {
  const [state, action, pending] = useActionState(createPurchaseOrderAction, empty);
  return (
    <form key={state.notice} onSubmit={submitWith(action)}>
      <Messages state={state} />
      <div className="field"><label className="field-label" htmlFor="po-supplier">Supplier *</label><input className="text-input" id="po-supplier" name="supplier" maxLength={120} required /></div>
      <WarehouseSelect warehouses={warehouses} label="Receive into" />
      <div className="field"><label className="field-label" htmlFor="po-lines">Lines, one per line: SKU | Quantity | Unit cost *</label><textarea className="textarea" id="po-lines" name="lines" rows={3} placeholder="AG-1 | 20 | 410.00" required /></div>
      <div className="field"><label className="field-label" htmlFor="po-note">Note</label><input className="text-input" id="po-note" name="note" maxLength={300} /></div>
      <div className="admin-actions"><button className="btn" disabled={pending}>{pending ? 'Creating…' : 'Create order'}</button></div>
    </form>
  );
}

const LABELS: Record<string, string> = { approved: 'Approve', rejected: 'Reject', received: 'Goods received', closed: 'Close' };

export function ReturnStatusForm({ id, next }: { id: string; next: ReturnStatus[] }) {
  const [state, action, pending] = useActionState(updateReturnAction.bind(null, id), empty);
  if (!next.length) return <span className="muted">—</span>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); const by = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null; if (by?.value) data.set('status', by.value); startTransition(() => action(data)); }}>
      <Messages state={state} />
      <input className="text-input" name="teamNote" placeholder="Note for the customer" aria-label="Note for the customer" maxLength={500} style={{ marginBottom: 6, minWidth: 180 }} />
      <div className="admin-actions" style={{ margin: 0 }}>{next.map((s) => <button key={s} className={`btn ${s === 'rejected' ? 'btn-danger' : 'btn-light'}`} name="status" value={s} disabled={pending}>{LABELS[s]}</button>)}</div>
    </form>
  );
}

export function RoleForm() {
  const [state, action, pending] = useActionState(setRoleAction, empty);
  return (
    <form key={state.notice} onSubmit={submitWith(action)}>
      <Messages state={state} />
      <div className="form-grid">
        <div className="field"><label className="field-label" htmlFor="role-email">Email of an existing account *</label><input className="text-input" id="role-email" name="email" type="email" required /></div>
        <div className="field"><label className="field-label" htmlFor="role">Role *</label><select className="select-input" id="role" name="role" defaultValue="staff"><option value="staff">Staff: runs the store, cannot refund</option><option value="admin">Admin: everything</option><option value="customer">No panel access</option></select></div>
      </div>
      <div className="admin-actions"><button className="btn" disabled={pending}>{pending ? 'Saving…' : 'Save role'}</button></div>
    </form>
  );
}
