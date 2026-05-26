export type UiLocale = 'es' | 'en';

export type PendingImagePayload = {
  dataUrl: string;
  mime: string;
  source: 'file' | 'web' | 'clipboard';
  sourceLabel?: string;
  error?: string;
  loading?: boolean;
};

export type CropRect = {
  /** 0–1 relative to natural image size */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type OcrResult = {
  text: string;
  confidence: number;
};
