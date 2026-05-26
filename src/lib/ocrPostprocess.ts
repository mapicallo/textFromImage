type OcrWord = { text: string; confidence: number };
type OcrLine = { text: string; confidence: number; words?: OcrWord[] };

const MIN_WORD_CONF = 55;
const MIN_LINE_CONF = 42;
const MIN_LETTER_RATIO = 0.4;

function letterRatio(text: string): number {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  return letters / Math.max(text.trim().length, 1);
}

function isNoiseWord(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.length === 1 && !/\p{L}/u.test(t)) return true;
  if (/^[\|\§\)\(\[\]\{\}]+$/.test(t)) return true;
  return false;
}

function filterWords(words: OcrWord[]): string {
  return words
    .filter((w) => !isNoiseWord(w.text))
    .filter((w) => w.confidence >= MIN_WORD_CONF || (w.text.length >= 3 && w.confidence >= 45))
    .map((w) => w.text.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isGarbageLine(text: string, confidence: number): boolean {
  const t = text.trim();
  if (!t) return true;
  if (confidence > 0 && confidence < MIN_LINE_CONF && letterRatio(t) < 0.5) return true;
  if (t.length <= 2 && letterRatio(t) < 0.5) return true;
  if (letterRatio(t) < MIN_LETTER_RATIO && t.length < 12) return true;
  return false;
}

function lineToText(line: OcrLine): string {
  if (Array.isArray(line.words) && line.words.length > 0) {
    const fromWords = filterWords(line.words);
    if (fromWords) return fromWords;
  }
  return line.text.replace(/\s+/g, ' ').trim();
}

export function extractLinesFromBlocks(blocks: unknown): OcrLine[] {
  if (!Array.isArray(blocks)) return [];
  const lines: OcrLine[] = [];
  for (const block of blocks) {
    const paragraphs = (block as { paragraphs?: unknown[] }).paragraphs;
    if (!Array.isArray(paragraphs)) continue;
    for (const paragraph of paragraphs) {
      const plines = (paragraph as { lines?: OcrLine[] }).lines;
      if (!Array.isArray(plines)) continue;
      for (const line of plines) {
        if (line?.text != null) lines.push(line);
      }
    }
  }
  return lines;
}

/** Drop low-confidence lines and OCR noise; rebuild readable text. */
export function buildTextFromOcrBlocks(blocks: unknown, fallbackText: string): string {
  const lines = extractLinesFromBlocks(blocks);
  if (lines.length === 0) return cleanupPlainText(fallbackText);

  const kept: string[] = [];
  for (const line of lines) {
    const text = lineToText(line);
    if (!text || isGarbageLine(text, line.confidence)) continue;
    kept.push(text);
  }

  if (kept.length === 0) return cleanupPlainText(fallbackText);
  return kept.join('\n').trim();
}

function cleanupPlainText(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !isGarbageLine(line, 0))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
