import { randomInt } from 'node:crypto';
import type { ShipmentStatus } from '../shipping';
import { notifyShipment } from './email';
import type { Order, Shipment, Store } from './store';

// Unguessable, and without characters that are easy to confuse when read aloud.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const newShipmentCode = () => `AG${Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`;
export const SHIPMENT_CODE = /^AG[2-9A-HJKMNP-Z]{10}$/;

export async function shipOrder(store: Store, order: Order, details: { carrier: string; trackingNumber?: string }, notify: boolean) {
  const shipment = await store.createShipment({ orderId: order.id, code: newShipmentCode(), ...details });
  const updated = await store.updateOrder(order.id, { status: 'fulfilled' });
  if (notify) await notifyShipment('order_shipped', updated, shipment);
  return shipment;
}

const CUSTOMER_EMAILS: Partial<Record<ShipmentStatus, 'order_out_for_delivery' | 'order_delivered'>> = {
  out_for_delivery: 'order_out_for_delivery',
  delivered: 'order_delivered',
};

export async function updateShipment(store: Store, order: Order, shipment: Shipment, event: { status: ShipmentStatus; location?: string; note?: string }, notify: boolean) {
  const updated = await store.addShipmentEvent(shipment.id, event);
  // A second update at the same stage, such as a new location, does not email the customer again.
  const email = CUSTOMER_EMAILS[event.status];
  if (notify && email && shipment.status !== event.status) await notifyShipment(email, order, updated);
  return updated;
}

// Only what the customer needs: no email, address or internal ids.
export function publicShipment(s: Shipment, carrierUrl?: string) {
  return {
    status: s.status,
    carrier: s.carrier,
    trackingNumber: s.trackingNumber,
    carrierUrl,
    events: s.events.map((e) => ({ status: e.status, location: e.location, note: e.note, occurredAt: e.occurredAt })),
  };
}
