'use client';

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

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

/** Resolves `var(--font-serif)` to the family name next/font actually generated. */
function resolveSerif(): string {
  const probe = document.createElement('span');
  probe.style.fontFamily = 'var(--font-serif)';
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  probe.remove();
  return family || 'serif';
}

function drawTitle(ink: string): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const family = resolveSerif();
  const size = 420;
  const leading = size * 0.92; // tight, like the poster

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink;

  const top = CANVAS_H / 2 - leading;
  LINES.forEach((line, i) => {
    ctx.font = `${line.italic ? 'italic ' : ''}${size}px ${family}`;
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

    // Wait for the webfont, or the first paint renders in a fallback serif and the
    // texture is baked wrong for the rest of the session.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      made = drawTitle(hex);
      setTex(made);
    });

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
