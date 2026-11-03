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

export function checkPhoto(bytes: Uint8Array): { ok: true; type: PhotoType } | { ok: false; error: string } {
  if (bytes.length > MAX_PHOTO_BYTES) return { ok: false, error: 'The photo is larger than 4 MB.' };
  const type = detectPhotoType(bytes);
  return type ? { ok: true, type } : { ok: false, error: 'Use a JPG, PNG or WebP photo.' };
}
