import type { OcrLang, OcrResult } from './types';

type WorkerHandle = Awaited<ReturnType<typeof import('tesseract.js').createWorker>>;

let workerPromise: Promise<WorkerHandle> | null = null;
let workerLang: OcrLang | null = null;
let progressCb: ((p: number) => void) | undefined;

function tessBase(): string {
  return chrome.runtime.getURL('tesseract/');
}

async function getWorker(lang: OcrLang): Promise<WorkerHandle> {
  if (workerPromise && workerLang === lang) return workerPromise;

  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
  }

  const { createWorker } = await import('tesseract.js');
  workerLang = lang;
  workerPromise = createWorker(lang, 1, {
    workerPath: `${tessBase()}worker.min.js`,
    corePath: tessBase(),
    langPath: `${tessBase()}lang`,
    workerBlobURL: false,
    gzip: true,
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        progressCb?.(m.progress);
      }
    },
  });
  return workerPromise;
}

export async function runOcr(
  image: Blob,
  lang: OcrLang,
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  progressCb = onProgress;
  try {
    const worker = await getWorker(lang);
    const { data } = await worker.recognize(image);
    const text = (data.text ?? '').trim();
    const confidence = typeof data.confidence === 'number' ? data.confidence : 0;
    return { text, confidence };
  } finally {
    progressCb = undefined;
  }
}

export async function terminateOcrWorker(): Promise<void> {
  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
    workerLang = null;
  }
}

export function classifyOcrOutput(text: string, confidence: number): 'ok' | 'empty' | 'low_quality' {
  const alnum = text.replace(/[\s\p{P}]/gu, '');
  if (!text || alnum.length < 2) return 'empty';
  if (confidence > 0 && confidence < 35 && alnum.length < 8) return 'low_quality';
  return 'ok';
}
