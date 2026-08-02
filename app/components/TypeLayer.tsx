'use client';

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { SERIF_FAMILY, SERIF_PRIMARY } from '../fonts';

/**
 * The hero line, drawn to a canvas and hung in the scene at z = 0.
 *
 * It lives IN the 3D scene rather than as a DOM overlay so it shares the caps'
 * perspective and depth — it is printed on the same wall the caps are sitting on,
 * and it dims behind the focus scrim like everything else in the scene.
 *
 * It sits BEHIND every cap. An earlier version put it at z = 0 to interleave with
 * them, but a cap spinning about Y sweeps its full diameter through Z, so the plane
 * cut straight through the mesh. The reference poster has caps resting on top of
 * printed type anyway — nothing is woven through.
 *
 * Canvas texture rather than troika/drei <Text>: no new dependency, no second font
 * fetch, and it reuses the Instrument Serif already loaded by next/font.
 */

/** Roman / italic / roman, matching the poster's mix. */
const LINES: { text: string; italic: boolean }[] = [
  { text: 'Drinks', italic: false },
  { text: 'of the', italic: true },
  { text: "2000's", italic: false },
];

const CANVAS_W = 2048;
const CANVAS_H = 1536;


function drawTitle(ink: string): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const size = 420;
  const leading = size * 0.92; // tight, like the poster

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink;

  const top = CANVAS_H / 2 - leading;
  LINES.forEach((line, i) => {
    ctx.font = `${line.italic ? 'italic ' : ''}${size}px ${SERIF_FAMILY}`;
    ctx.fillText(line.text, CANVAS_W / 2, top + i * leading);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function useTitleTexture(ink: THREE.Color) {
  const hex = useMemo(() => `#${ink.getHexString()}`, [ink]);
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let made: THREE.CanvasTexture | null = null;

    /**
     * `document.fonts.ready` is NOT enough on its own, and that is the whole bug this
     * replaced. Canvas `fillText` never triggers a font download, and nothing else on
     * the page renders this face until a cap is opened — so the font was never
     * requested, `ready` resolved instantly, and the texture baked in a system serif
     * for the rest of the session. It looked like a deliberate typeface choice.
     *
     * `document.fonts.load()` is what actually fetches it. Both styles, because the
     * middle line is italic and loading the roman does not bring the italic with it.
     */
    const draw = () => {
      if (cancelled) return;
      made = drawTitle(hex);
      setTex(made);
    };

    Promise.all([
      document.fonts.load(`400 100px ${SERIF_PRIMARY}`),
      document.fonts.load(`italic 400 100px ${SERIF_PRIMARY}`),
    ])
      .then(() => document.fonts.ready)
      // Never let a font problem cost us the title entirely. Worst case it bakes in a
      // fallback face, which is a cosmetic regression; failing closed renders nothing
      // at all, which is a blank hero.
      .catch(() => undefined)
      .then(draw);

    return () => {
      cancelled = true;
      made?.dispose();
    };
  }, [hex]);

  return tex;
}

export default function TypeLayer({
  texture,
  materialRef,
  width,
  z,
}: {
  texture: THREE.CanvasTexture;
  materialRef: React.Ref<THREE.MeshBasicMaterial>;
  width: number;
  z: number;
}) {
  const height = (width * CANVAS_H) / CANVAS_W;
  return (
    <mesh position={[0, 0, z]} frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        // Depth-tested so caps in front occlude it and caps behind sit under it,
        // but it writes no depth of its own — the transparent margin must not
        // punch a hole in the caps around the letters.
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
