/**
 * Chrome Web Store promo tiles (440×280 and 1400×560, opaque).
 */
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const iconPath = join(root, 'public', 'icons', 'icon-128.png');
const outDir = join(root, 'store-assets', 'cws-ready');

const BG_TOP = '#0f172a';
const BG_BOTTOM = '#1e3a5f';

if (!existsSync(iconPath)) {
  console.error('Missing icon. Run: npm run icons');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

function gradientPng(width, height) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${BG_TOP}"/>
    <stop offset="100%" stop-color="${BG_BOTTOM}"/>
  </linearGradient>
</defs>
<rect width="100%" height="100%" fill="url(#g)"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function buildMarquee() {
  const W = 1400;
  const H = 560;
  const base = await gradientPng(W, H);
  const iconSize = 212;
  const iconLeft = 72;
  const iconTop = Math.round((H - iconSize) / 2);
  const iconBuf = await sharp(iconPath)
    .flatten({ background: { r: 15, g: 23, b: 42 } })
    .resize(iconSize, iconSize, { fit: 'contain', background: { r: 15, g: 23, b: 42 } })
    .png()
    .toBuffer();

  const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="${H}">
  <text x="0" y="200" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="54" font-weight="700" fill="#e7edf5">TextFromImage</text>
  <text x="0" y="270" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="28" fill="#94a3b8">Extract text from images locally</text>
  <text x="0" y="320" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="21" fill="#64748b">Web · files · clipboard · crop · EN+ES OCR · no cloud</text>
</svg>`;
  const textBuf = await sharp(Buffer.from(textSvg)).png().toBuffer();
  const dest = join(outDir, 'tile-marquee-1400x560.png');
  const merged = await sharp(base)
    .composite([
      { input: iconBuf, left: iconLeft, top: iconTop },
      { input: textBuf, left: iconLeft + iconSize + 40, top: 0 },
    ])
    .flatten({ background: BG_TOP })
    .jpeg({ quality: 96 })
    .toBuffer();
  await sharp(merged).png({ compressionLevel: 9 }).toFile(dest);
  console.log('OK', dest);
}

async function buildSmall() {
  const W = 440;
  const H = 280;
  const base = await gradientPng(W, H);
  const iconSize = 96;
  const iconLeft = 20;
  const iconTop = Math.round((H - iconSize) / 2);
  const iconBuf = await sharp(iconPath)
    .flatten({ background: { r: 15, g: 23, b: 42 } })
    .resize(iconSize, iconSize, { fit: 'contain' })
    .png()
    .toBuffer();

  const textW = W - iconLeft - iconSize - 18;
  const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${textW}" height="${H}">
  <text x="0" y="102" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="700" fill="#e7edf5">TextFromImage</text>
  <text x="0" y="132" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#94a3b8">Local OCR from images</text>
  <text x="0" y="154" font-family="Segoe UI, Arial, sans-serif" font-size="11" fill="#64748b">Web · files · EN+ES</text>
</svg>`;
  const textBuf = await sharp(Buffer.from(textSvg)).png().toBuffer();
  const dest = join(outDir, 'tile-small-440x280.png');
  const merged = await sharp(base)
    .composite([
      { input: iconBuf, left: iconLeft, top: iconTop },
      { input: textBuf, left: iconLeft + iconSize + 14, top: 0 },
    ])
    .flatten({ background: BG_TOP })
    .jpeg({ quality: 96 })
    .toBuffer();
  await sharp(merged).png({ compressionLevel: 9 }).toFile(dest);
  console.log('OK', dest);
}

await buildMarquee();
await buildSmall();
console.log('\nTiles written to:', outDir);
