import { loadImageFromBlob } from './imageSources';

const MIN_SHORT_SIDE = 1200;
const MAX_SCALE = 2.5;

/**
 * Upscale + grayscale + mild contrast boost — Tesseract works much better on this.
 */
export async function preprocessBlobForOcr(blob: Blob): Promise<Blob> {
  const img = await loadImageFromBlob(blob);
  const shortSide = Math.min(img.naturalWidth, img.naturalHeight);
  const scale = Math.min(MAX_SCALE, Math.max(1, MIN_SHORT_SIDE / shortSide));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    const boosted = Math.max(0, Math.min(255, (gray - 128) * 1.2 + 128));
    d[i] = boosted;
    d[i + 1] = boosted;
    d[i + 2] = boosted;
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Preprocess failed'))), 'image/png');
  });
}
