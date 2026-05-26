import type { CropRect } from './types';

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function cropBlobToBlob(blob: Blob, rect: CropRect): Promise<Blob> {
  const img = await loadImageFromBlob(blob);
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const x = Math.max(0, Math.floor(rect.x * nw));
  const y = Math.max(0, Math.floor(rect.y * nh));
  const w = Math.min(nw - x, Math.floor(rect.w * nw));
  const h = Math.min(nh - y, Math.floor(rect.h * nh));
  if (w < 8 || h < 8) throw new Error('Crop too small');

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Crop failed'))), blob.type || 'image/png');
  });
}

export async function blobToImageData(blob: Blob): Promise<ImageData> {
  const img = await loadImageFromBlob(blob);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function isImageMime(mime: string): boolean {
  return /^image\/(png|jpe?g|gif|webp|bmp)$/i.test(mime);
}
