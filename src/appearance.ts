import { stickers } from './stickers';
import defaultStrap from './assets/strap-cutout.png';

export const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export type Corner = typeof corners[number];
export type Decoration = { image: string; size: number; angle: number };
export type Appearance = { version: 1; corners: Record<Corner, Decoration>; strap: Decoration & { side: 'left' | 'right' } };
export const APPEARANCE_KEY = 'yui-pocket.appearance.v1';
export const MAX_IMAGE_LENGTH = 380000;
const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const clamp = (x: unknown, min: number, max: number, fallback: number) => typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : fallback;
const isLocalImage = (value: string) => value.length < MAX_IMAGE_LENGTH && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
export function imageSource(id: string): string | undefined {
  if (id === 'default-strap') return defaultStrap;
  return stickers.find(item => item.id === id)?.src ?? (isLocalImage(id) ? id : undefined);
}
export function defaults(): Appearance {
  return { version: 1, corners: {
    'top-left': { image: 'none', size: 100, angle: 0 },
    'top-right': { image: 'none', size: 100, angle: 0 },
    'bottom-left': { image: 'halo', size: 100, angle: -7 },
    'bottom-right': { image: 'none', size: 100, angle: 0 },
  }, strap: { image: 'default-strap', size: 100, angle: 0, side: 'left' } };
}
function decoration(raw: unknown, fallback: Decoration): Decoration {
  if (!isRecord(raw)) return { ...fallback };
  const id = raw.image;
  const image = typeof id === 'string' && (id === 'none' || id === 'halo' || !!imageSource(id)) ? id : fallback.image;
  return { image, size: clamp(raw.size, 60, 130, 100), angle: clamp(raw.angle, -25, 25, 0) };
}
export function normalizeAppearance(raw: unknown): Appearance {
  const result = defaults();
  if (!isRecord(raw) || raw.version !== 1) return result;
  const slots = isRecord(raw.corners) ? raw.corners : {};
  for (const corner of corners) result.corners[corner] = decoration(slots[corner], result.corners[corner]);
  if (isRecord(raw.strap)) result.strap = { ...decoration(raw.strap, result.strap), size: clamp(raw.strap.size,60,120,100), angle: clamp(raw.strap.angle,-4,4,0), side: raw.strap.side === 'right' ? 'right' : 'left' };
  return result;
}

/** One owned browser-local preference, never the host's settings or chat storage. */
export function appearanceStorage(host: Window) {
  return {
    load(): Appearance {
      try {
        const raw = host.localStorage.getItem(APPEARANCE_KEY);
        return raw && raw.length < 2000000 ? normalizeAppearance(JSON.parse(raw)) : defaults();
      } catch { return defaults(); }
    },
    save(value: Appearance): boolean {
      try { host.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(normalizeAppearance(value))); return true; }
      catch { return false; }
    },
    clear(): boolean {
      try { host.localStorage.removeItem(APPEARANCE_KEY); return true; }
      catch { return false; }
    },
  };
}

/** Decode raster-only local files and re-encode to strip metadata, without upload. */
export async function readDecoration(file: File, document: Document): Promise<string> {
  if (file.size > 2 * 1024 * 1024) throw new Error('图片请小于 2 MB');
  const data = new Uint8Array(await file.arrayBuffer());
  const png = data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71;
  const jpeg = data[0] === 255 && data[1] === 216 && data[2] === 255;
  const webp = String.fromCharCode(...data.slice(0, 4)) === 'RIFF' && String.fromCharCode(...data.slice(8, 12)) === 'WEBP';
  if (!png && !jpeg && !webp) throw new Error('请选择 PNG、JPEG 或 WebP 图片');
  const url = URL.createObjectURL(file);
  try {
    const image = document.createElement('img');
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > 4096 || image.naturalHeight > 4096) throw new Error('图片尺寸请不超过 4096×4096');
    const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器无法处理图片');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/webp', .9);
    if (!isLocalImage(result)) throw new Error('处理后的图片仍然太大，请换一张更小的图');
    return result;
  } finally { URL.revokeObjectURL(url); }
}
