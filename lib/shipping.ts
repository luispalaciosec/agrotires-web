export type ShipmentStatus = 'label_created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';

// The normal path of a shipment; an exception can happen at any point and is shown apart.
export const SHIPMENT_STAGES: ShipmentStatus[] = ['label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
export const SHIPMENT_STATUSES: ShipmentStatus[] = [...SHIPMENT_STAGES, 'exception'];

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  label_created: 'Label created',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  exception: 'Problem reported',
};

const CARRIER_LINKS: Record<string, (n: string) => string> = {
  UPS: (n) => `https://www.ups.com/track?tracknum=${n}`,
  FedEx: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  USPS: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  DHL: (n) => `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`,
};

export const CARRIERS = [...Object.keys(CARRIER_LINKS), 'Freight carrier', 'AGROTIRES delivery'];

export const carrierLink = (carrier: string, tracking?: string) => (tracking && CARRIER_LINKS[carrier] ? CARRIER_LINKS[carrier](encodeURIComponent(tracking)) : undefined);
