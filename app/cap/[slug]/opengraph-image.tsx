import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CAPS } from '../../data/caps';

export const alt = 'A 3D crown cap from an early-2000s Nigerian soft drink';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** One card per cap, prerendered alongside the routes. */
export function generateStaticParams() {
  return CAPS.map((cap) => ({ slug: cap.slug }));
}

/**
 * Instrument Serif has no naira glyph (U+20A6), so "₦25" renders as a tofu box in
 * the card. The caps themselves print it both ways — the ₦25 7up also reads "N25" —
 * so falling back to N is accurate rather than a fudge. Only the OG image is
 * affected; the site keeps ₦ everywhere, where the browser can pick a fallback font.
 */
const ogSafe = (s: string) => s.replace(/₦/g, 'N');

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cap = CAPS.find((c) => c.slug === slug);

  // Satori renders these, and it does not reliably decode WebP — hence the dedicated
  // PNG emitted by scripts/extract-textures.mjs. Read from disk rather than fetched
  // over HTTP: at build time the site is not serving yet.
  const [font, capPng] = await Promise.all([
    readFile(join(process.cwd(), 'app/fonts/InstrumentSerif-Regular.ttf')),
    readFile(join(process.cwd(), 'public/tex', `${cap?.texture ?? 'coca-cola'}-og.png`)),
  ]);
  const src = `data:image/png;base64,${capPng.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 72,
          padding: '0 96px',
          background: '#EFEDE8', // --paper
          fontFamily: 'Instrument Serif',
        }}
      >
        <img src={src} width={380} height={380} alt="" />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 108, color: '#201F1D', lineHeight: 1 }}>
            {cap?.name ?? 'Crown Caps'}
          </div>
          {cap?.variant && (
            <div style={{ fontSize: 54, color: '#635F5C', fontStyle: 'italic', marginTop: 8 }}>
              {ogSafe(cap.variant)}
            </div>
          )}
          <div
            style={{
              fontSize: 26,
              color: '#A39D97',
              marginTop: 28,
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            Drinks of the 2000&rsquo;s
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Instrument Serif', data: font, style: 'normal', weight: 400 }],
    },
  );
}
