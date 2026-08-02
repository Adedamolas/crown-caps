'use client';

import { useEffect, useState } from 'react';
import * as THREE from 'three';
import type { Cap } from '../data/caps';
import { SANS_FAMILY } from '../fonts';

/**
 * The message under the crown — CLAUDE.md §6's "magic moment".
 *
 * ⚠️ This is a DESIGNED element, not a factual claim, and it must stay that way.
 * It echoes the win / try-again under-crown promos of the era in the abstract; it does
 * NOT reproduce any real promotion, prize, or wording from a specific brand. Keep the
 * copy generic. Anything that reads as a historical claim belongs in `caps.ts` behind
 * a source, per CLAUDE.md §8.
 */
const MESSAGES = ['TRY AGAIN', 'TRY AGAIN', 'TRY AGAIN', 'TRY AGAIN', 'ONE MORE TIME'] as const;

/** Stable per cap, so the same cap always shows the same message. */
export function messageFor(cap: Cap): string {
  let h = 0;
  for (let i = 0; i < cap.slug.length; i++) h = (h * 31 + cap.slug.charCodeAt(i)) | 0;
  return MESSAGES[Math.abs(h) % MESSAGES.length];
}

const SIZE = 512;

function draw(text: string, ink: string): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // The liner's own colour, so the print sits on the mint rather than on transparency.
  ctx.fillStyle = '#b7e6de';
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.translate(SIZE / 2, SIZE / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink;

  // Sized to sit inside the liner's flat centre, clear of the crimped skirt.
  ctx.font = `600 ${text.length > 9 ? 44 : 58}px ${SANS_FAMILY}`;
  ctx.letterSpacing = '4px';
  ctx.fillText(text, 0, 0);

  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, SIZE * 0.33, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // The liner is only ever seen through a 180° flip about X, which maps local +y to
  // screen -y. With the default flipY the canvas top lands at the bottom and the
  // message reads mirrored. Disabling it cancels exactly that.
  tex.flipY = false;
  return tex;
}

export function useRevealTexture(cap: Cap | null, ink: THREE.Color) {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  const slug = cap?.slug ?? null;
  const hex = `#${ink.getHexString()}`;

  useEffect(() => {
    if (!cap) return;
    let cancelled = false;
    let made: THREE.CanvasTexture | null = null;

    // Same trap as the hero type: canvas text never triggers a font fetch, so the
    // face has to be requested explicitly before it can be drawn with.
    document.fonts
      .load(`600 58px ${SANS_FAMILY}`)
      .then(() => document.fonts.ready)
      .then(() => {
        if (cancelled) return;
        made = draw(messageFor(cap), hex);
        setTex(made);
      });

    return () => {
      cancelled = true;
      made?.dispose();
    };
    // Keyed on the slug: one texture at a time, rebuilt when focus moves on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, hex]);

  return tex;
}
