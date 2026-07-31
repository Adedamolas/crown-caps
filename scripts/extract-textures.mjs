/**
 * Pulls the single cover PNG out of each cap GLB and writes two WebP sizes.
 * See docs/ASSETS.md §2. Run: node scripts/extract-textures.mjs
 *
 * The GLBs stay untouched in /public as the source of truth — this only reads them.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PUBLIC = path.join(import.meta.dirname, '..', 'public');
const OUT = path.join(PUBLIC, 'tex');

/** Read the JSON chunk + BIN chunk offset out of a .glb container. */
function readGlb(buf) {
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  return { json, binOffset: 20 + jsonLen + 8 };
}

fs.mkdirSync(OUT, { recursive: true });

const files = fs
  .readdirSync(PUBLIC)
  .filter((f) => f.endsWith('.glb'))
  .sort();

let totalIn = 0;
let total256 = 0;
let total1024 = 0;

for (const file of files) {
  const slug = file.replace(/\.glb$/, '');
  const { json, binOffset } = readGlb(fs.readFileSync(path.join(PUBLIC, file)));

  const image = json.images?.[0];
  if (!image) {
    console.warn(`  !! ${file} has no embedded image — skipped`);
    continue;
  }

  const view = json.bufferViews[image.bufferView];
  const start = binOffset + (view.byteOffset ?? 0);
  const png = fs.readFileSync(path.join(PUBLIC, file)).subarray(start, start + view.byteLength);
  totalIn += png.length;

  // Square them off (sources are ~1401x1389) so mipmapping behaves.
  for (const [size, quality] of [
    [256, 80],
    [1024, 85],
  ]) {
    const out = path.join(OUT, `${slug}-${size}.webp`);
    const { size: bytes } = await sharp(png)
      .resize(size, size, { fit: 'fill' })
      .webp({ quality })
      .toFile(out);
    if (size === 256) total256 += bytes;
    else total1024 += bytes;
  }

  console.log(`  ${slug.padEnd(20)} ${image.name}`);
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`\n  ${files.length} caps`);
console.log(`  source PNG total : ${kb(totalIn)}`);
console.log(`  256px WebP total : ${kb(total256)}   <- grid, loaded up front`);
console.log(`  1024px WebP total: ${kb(total1024)}   <- focus, loaded on demand`);
