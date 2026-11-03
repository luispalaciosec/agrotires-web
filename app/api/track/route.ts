import { z } from 'zod';
import { carrierLink } from '@/lib/shipping';
import { clientIp, json, rateLimited, readJson, sameOrigin } from '@/lib/server/http';
import { publicShipment, SHIPMENT_CODE } from '@/lib/server/shipments';
import { getStore } from '@/lib/server/store';

const schema = z.object({ code: z.string().trim().toUpperCase().regex(SHIPMENT_CODE) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  if (await rateLimited(`track:${clientIp(req)}`, 20)) return json({ error: 'Too many requests' }, 429);
  const store = getStore();
  if (!store) return json({ error: 'Tracking is not available yet' }, 503);

  const body = await readJson(req);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  // A malformed code answers the same as an unknown one.
  if (!parsed.success) return json({ error: 'Not found' }, 404);

  try {
    const shipment = await store.getShipmentByCode(parsed.data.code);
    if (!shipment) return json({ error: 'Not found' }, 404);
    return json(publicShipment(shipment, carrierLink(shipment.carrier, shipment.trackingNumber)));
  } catch (e) {
    console.error('Tracking lookup failed', e);
    return json({ error: 'Tracking is not available right now' }, 503);
  }
}
