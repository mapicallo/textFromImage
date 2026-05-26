/**
 * Chrome Web Store screenshots (1280×800, opaque).
 * Uses pantallazos/*.png when present; otherwise generates marketing previews.
 */
import { mkdirSync, readdirSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const inDir = join(root, 'pantallazos');
const outDir = join(root, 'store-assets', 'cws-ready');
const iconPath = join(root, 'public', 'icons', 'icon-128.png');

const W = 1280;
const H = 800;
const BG = { r: 15, g: 20, b: 25, alpha: 1 };

mkdirSync(outDir, { recursive: true });

async function normalizePng(src, dest) {
  await sharp(src)
    .flatten({ background: BG })
    .resize(W, H, { fit: 'contain', position: 'center', background: BG })
    .png({ compressionLevel: 9, force: true })
    .toFile(dest);
  const meta = await sharp(dest).metadata();
  console.log('OK', dest, `${meta.width}x${meta.height}`);
}

function panelMock(title, subtitle, lines) {
  const body = lines
    .map(
      (line, i) =>
        `<text x="48" y="${200 + i * 36}" font-family="Segoe UI, Arial, sans-serif" font-size="22" fill="#94a3b8">${line}</text>`
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="100%" height="100%" fill="#0f1419"/>
<rect x="340" y="40" width="600" height="720" rx="12" fill="#1a2332" stroke="#2d3b50"/>
<text x="368" y="88" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700" fill="#e7edf5">${title}</text>
<text x="368" y="122" font-family="Segoe UI, Arial, sans-serif" font-size="15" fill="#8b9cb3">${subtitle}</text>
<rect x="368" y="150" width="544" height="220" rx="8" fill="#0f1419" stroke="#2d3b50" stroke-dasharray="8 6"/>
<rect x="388" y="400" width="504" height="140" rx="8" fill="#0f1419" stroke="#2d3b50"/>
<text x="388" y="430" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#8b9cb3">Detected text</text>
${body}
<rect x="368" y="680" width="544" height="48" fill="#0e1520"/>
<text x="420" y="710" font-family="Segoe UI, Arial, sans-serif" font-size="14" fill="#8b9cb3">por </text>
<text x="448" y="710" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="#e7edf5">AI4Context</text>
<text x="560" y="710" font-family="Segoe UI, Arial, sans-serif" font-size="14" fill="#4b5563"> | </text>
<text x="578" y="710" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="600" fill="#f5b84a">Support</text>
</svg>`;
}

async function generateDefaults() {
  if (!existsSync(iconPath)) {
    console.error('Missing icon. Run: npm run icons');
    process.exit(1);
  }
  const iconBuf = await sharp(iconPath)
    .resize(96, 96)
    .png()
    .toBuffer();

  const slides = [
    {
      name: '01-panel-drop-cws-1280x800.png',
      svg: panelMock(
        'TextFromImage',
        'Extract text from images on your device (Spanish and English)',
        ['Drop, paste, or pick a file', 'Local OCR — no cloud upload']
      ),
    },
    {
      name: '02-crop-ocr-cws-1280x800.png',
      svg: panelMock(
        'TextFromImage',
        'Optional crop before OCR',
        ['Drag to mark the text area', 'Copy or download .txt']
      ),
    },
    {
      name: '03-web-context-cws-1280x800.png',
      svg: panelMock(
        'TextFromImage',
        'Right-click any image on the web',
        ['Context menu → Extract text from image', 'Host permission only when needed']
      ),
    },
  ];

  for (const slide of slides) {
    const dest = join(outDir, slide.name);
    const base = await sharp(Buffer.from(slide.svg)).png().toBuffer();
    await sharp(base)
      .composite([{ input: iconBuf, left: 48, top: 48 }])
      .flatten({ background: BG })
      .png({ compressionLevel: 9 })
      .toFile(dest);
    console.log('OK generated', dest);
  }
}

if (existsSync(inDir)) {
  const files = readdirSync(inDir).filter(
    (f) => f.toLowerCase().endsWith('.png') && !f.includes('cws-ready')
  );
  if (files.length > 0) {
    for (const f of files.sort()) {
      const base = f.replace(/\.png$/i, '');
      await normalizePng(join(inDir, f), join(outDir, `${base}-cws-${W}x${H}.png`));
    }
    console.log('\nNormalized from pantallazos/ →', outDir);
    process.exit(0);
  }
}

await generateDefaults();
console.log('\nScreenshots in:', outDir);
console.log('Tip: add real PNGs to pantallazos/ and re-run for custom captures.');
