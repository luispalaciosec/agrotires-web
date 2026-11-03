type EventData = { productSlug?: string; query?: string; results?: number; locale?: string };

// First-party and without cookies: a random id that disappears when the browser session ends.
function session() {
  const KEY = 'agrotires-session';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, '');
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

export function trackEvent(name: 'view_product' | 'add_to_cart' | 'begin_checkout' | 'purchase' | 'search', data: EventData = {}) {
  try {
    if (navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    const body = JSON.stringify({ name, session: session(), ...data });
    fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {
    // Analytics must never interrupt the store.
  }
}
