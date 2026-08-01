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
  .filter((f) => f.endsWith('.glb') && !f.startsWith('cap-')) // cap-lo/cap-hi are derived
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

  // A PNG for Open Graph cards. Two things make this more than a resize:
  //
  // 1. Satori renders OG images and does not reliably decode WebP, so this needs
  //    its own format.
  // 2. The source texture is a UV ATLAS, not a label. Most of it is the unwrapped
  //    skirt; the printed cap FACE is a single island in the bottom-right. Using
  //    the whole atlas gives a flat disc of brand colour with the logo shoved into
  //    a corner. These fractions crop the face island — identical for every cap,
  //    because all 14 share one mesh and therefore one UV layout.
  const FACE = { left: 0.6, top: 0.548, size: 0.4 };
  const meta = await sharp(png).metadata();
  const left = Math.round(FACE.left * meta.width);
  const top = Math.round(FACE.top * meta.height);
  const side = Math.min(
    Math.round(FACE.size * meta.width),
    meta.width - left,
    meta.height - top,
  );
  const FACE_PX = 512;
  const disc = Buffer.from(
    `<svg width="${FACE_PX}" height="${FACE_PX}"><circle cx="${FACE_PX / 2}" cy="${FACE_PX / 2}" r="${FACE_PX / 2}" fill="#fff"/></svg>`,
  );
  await sharp(png)
    .extract({ left, top, width: side, height: side })
    .resize(FACE_PX, FACE_PX)
    // Round it off here rather than in CSS: the artwork's corners are brand colour,
    // so a CSS border-radius would leave a coloured disc wider than the cap.
    .composite([{ input: disc, blend: 'dest-in' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, `${slug}-og.png`));

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
