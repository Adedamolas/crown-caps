/**
 * Builds the two shared cap meshes from a single source GLB.
 * See docs/ASSETS.md §2. Run: node scripts/build-geometry.mjs
 *
 * All 14 GLBs contain identical geometry (measured), so we take one, strip its
 * texture, and emit:
 *   cap-lo.glb  — decimated, for every instance in the grid
 *   cap-hi.glb  — full detail, fetched only when a cap is focused
 *
 * Textures are bound at runtime from /public/tex (see extract-textures.mjs).
 * Compression is meshopt, not Draco — faster to decode on low-end devices, and it
 * avoids the libdraco.so crash in the Flatpak Blender (CLAUDE.md §7).
 */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';

const PUBLIC = path.join(import.meta.dirname, '..', 'public');
const SOURCE = path.join(PUBLIC, 'goldspot.glb');

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

/** Drop every image + texture binding so only geometry ships. */
function stripTextures(doc) {
  for (const mat of doc.getRoot().listMaterials()) {
    mat.setBaseColorTexture(null);
    mat.setMetallicRoughnessTexture(null);
    mat.setNormalTexture(null);
    mat.setEmissiveTexture(null);
    mat.setOcclusionTexture(null);
  }
  for (const tex of doc.getRoot().listTextures()) tex.dispose();
}

const triCount = (doc) =>
  doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0);

async function build({ out, ratio }) {
  const doc = await io.read(SOURCE);

  // Order matters: keep the texture bound through weld/simplify/prune, otherwise
  // `prune()` sees an unused TEXCOORD_0 and deletes it — which leaves every cap
  // sampling a single corner pixel and rendering as a flat block of colour.
  await doc.transform(weld(), dedup());
  const before = triCount(doc);

  if (ratio < 1) {
    await doc.transform(
      simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.005, lockBorder: true }),
    );
  }
  await doc.transform(prune());

  // Only now drop the image bytes. No prune after this point.
  stripTextures(doc);

  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: 'quantize' });

  const dest = path.join(PUBLIC, out);
  await io.write(dest, doc);

  const bytes = fs.statSync(dest).size;
  console.log(
    `  ${out.padEnd(12)} ${Math.round(before)} -> ${Math.round(triCount(doc))} tris` +
      `   ${(bytes / 1024).toFixed(0)} KB`,
  );
  return bytes;
}

console.log(`  source: ${path.basename(SOURCE)} (${(fs.statSync(SOURCE).size / 1024).toFixed(0)} KB)\n`);
const lo = await build({ out: 'cap-lo.glb', ratio: 0.08 });
const hi = await build({ out: 'cap-hi.glb', ratio: 1 });

console.log(`\n  grid first paint : ${(lo / 1024).toFixed(0)} KB geometry + 46 KB textures`);
console.log(`  on first focus   : ${(hi / 1024).toFixed(0)} KB geometry + ~29 KB texture`);
console.log(`  (all 14 raw GLBs : 16915 KB)`);
