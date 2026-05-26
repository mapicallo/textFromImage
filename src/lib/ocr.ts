import type { OcrResult } from './types';
import { preprocessBlobForOcr } from './imagePreprocess';
import { buildTextFromOcrBlocks } from './ocrPostprocess';

/** Bundled traineddata: English + Spanish (no user-facing language picker). */
const OCR_LANGS = ['eng', 'spa'] as const;

type WorkerHandle = Awaited<ReturnType<typeof import('tesseract.js').createWorker>>;

let workerPromise: Promise<WorkerHandle> | null = null;
let progressCb: ((p: number) => void) | undefined;

function tessBase(): string {
  return chrome.runtime.getURL('tesseract/');
}

async function configureWorker(worker: WorkerHandle): Promise<void> {
  const { PSM } = await import('tesseract.js');
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  });
}

async function getWorker(): Promise<WorkerHandle> {
  if (workerPromise) return workerPromise;

  const { createWorker } = await import('tesseract.js');
  workerPromise = (async () => {
    const worker = await createWorker([...OCR_LANGS], 1, {
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
    await configureWorker(worker);
    return worker;
  })();
  return workerPromise;
}

export async function runOcr(
  image: Blob,
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  progressCb = onProgress;
  try {
    const worker = await getWorker();
    const prepared = await preprocessBlobForOcr(image);
    const { data } = await worker.recognize(prepared, {}, { blocks: true });
    const rawText = (data.text ?? '').trim();
    const text = buildTextFromOcrBlocks(data.blocks, rawText);
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
  }
}

export function classifyOcrOutput(text: string, confidence: number): 'ok' | 'empty' | 'low_quality' {
  const alnum = text.replace(/[\s\p{P}]/gu, '');
  if (!text || alnum.length < 2) return 'empty';
  if (confidence > 0 && confidence < 40 && alnum.length < 12) return 'low_quality';
  if (letterRatioLow(text) && confidence < 55) return 'low_quality';
  return 'ok';
}

function letterRatioLow(text: string): boolean {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  return letters / Math.max(text.length, 1) < 0.35;
}
