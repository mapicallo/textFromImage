/**
 * Copy Tesseract.js runtime assets into public/tesseract for MV3 (no CDN).
 * Language data: eng + spa (download on first run if missing).
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { get } from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const tessDist = join(root, 'node_modules', 'tesseract.js', 'dist');
const coreDist = join(root, 'node_modules', 'tesseract.js-core');
const out = join(root, 'public', 'tesseract');
const langOut = join(out, 'lang');

const CORE_FILES = [
  'tesseract-core.wasm.js',
  'tesseract-core-simd.wasm.js',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
];

const LANG_FILES = [
  {
    name: 'eng.traineddata.gz',
    url: 'https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0/eng.traineddata.gz',
  },
  {
    name: 'spa.traineddata.gz',
    url: 'https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0/spa.traineddata.gz',
  },
];

function copyDist() {
  if (!existsSync(tessDist)) {
    console.error('Missing tesseract.js dist. Run: npm install');
    process.exit(1);
  }
  if (!existsSync(coreDist)) {
    console.error('Missing tesseract.js-core. Run: npm install');
    process.exit(1);
  }
  mkdirSync(out, { recursive: true });
  mkdirSync(langOut, { recursive: true });

  const worker = join(tessDist, 'worker.min.js');
  if (existsSync(worker)) copyFileSync(worker, join(out, 'worker.min.js'));

  for (const f of CORE_FILES) {
    const src = join(coreDist, f);
    if (!existsSync(src)) {
      console.error('Missing core file:', f);
      process.exit(1);
    }
    copyFileSync(src, join(out, f));
    console.log('copied core', f);
  }
}

async function downloadLang({ name, url }) {
  const dest = join(langOut, name);
  if (existsSync(dest)) {
    console.log('skip lang (exists)', name);
    return;
  }
  console.log('download lang', name);
  await new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        get(res.headers.location, (r2) => {
          pipeline(r2, createWriteStream(dest)).then(resolve).catch(reject);
        }).on('error', reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      pipeline(res, createWriteStream(dest)).then(resolve).catch(reject);
    }).on('error', reject);
  });
}

copyDist();
for (const lang of LANG_FILES) {
  await downloadLang(lang);
}

writeFileSync(
  join(out, 'README.txt'),
  'Tesseract runtime for TextFromImage extension. eng + spa traineddata (gzip).\n'
);
console.log('Tesseract assets ready in public/tesseract/');
