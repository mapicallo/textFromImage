/**
 * PNG icons from assets/icons/icon.svg → public/icons/
 */
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'assets', 'icons', 'icon.svg');
const outDir = join(root, 'public', 'icons');
const sizes = [16, 32, 48, 128];

const svg = readFileSync(svgPath);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

for (const s of sizes) {
  const out = join(outDir, `icon-${s}.png`);
  await sharp(svg, { density: 300 })
    .resize(s, s, { fit: 'contain', background: { r: 15, g: 20, b: 25, alpha: 1 } })
    .png()
    .toFile(out);
  console.log('wrote', out);
}

console.log('OK:', sizes.map((s) => `${s}px`).join(', '));
