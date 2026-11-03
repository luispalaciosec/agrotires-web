// Vercel rejects larger request bodies, and the browser shrinks photos well below this first.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export type PhotoType = 'image/jpeg' | 'image/png' | 'image/webp';
export const PHOTO_EXTENSIONS: Record<PhotoType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Decides from the file's own bytes, since its name and declared type are whatever the sender says.
// SVG and HTML are refused because a browser could run scripts inside them.
export function detectPhotoType(b: Uint8Array): PhotoType | undefined {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return undefined;
}

export const MAX_PHOTOS = 8;

// The panel says which of the product's current photos stay and in what order.
// Only photos it already owns are accepted, so the form cannot point a product at any other address.
export function keptPhotos(raw: string, owned: string[], added: number): { ok: true; keep: string[] } | { ok: false; error: string } {
  let list: unknown;
  try {
    list = JSON.parse(raw || '[]');
  } catch {
    return { ok: false, error: 'The photo list could not be read. Reload the page and try again.' };
  }
  if (!Array.isArray(list) || !list.every((img) => typeof img === 'string' && owned.includes(img))) return { ok: false, error: 'Choose an available image' };
  const keep = [...new Set(list as string[])];
  if (keep.length + added > MAX_PHOTOS) return { ok: false, error: `A product can have up to ${MAX_PHOTOS} photos.` };
  return { ok: true, keep };
}

export function checkPhoto(bytes: Uint8Array): { ok: true; type: PhotoType } | { ok: false; error: string } {
  if (bytes.length > MAX_PHOTO_BYTES) return { ok: false, error: 'The photo is larger than 4 MB.' };
  const type = detectPhotoType(bytes);
  return type ? { ok: true, type } : { ok: false, error: 'Use a JPG, PNG or WebP photo.' };
}
