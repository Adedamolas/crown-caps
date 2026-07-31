'use client';

import { CAPS } from '../data/caps';
import { SITE } from '../site';

/**
 * Shown when a WebGL context cannot be created — older Android, a locked-down
 * browser, a GPU blocklist, or a machine that has simply run out of contexts.
 *
 * The whole page is one canvas, so without this the site is a blank rectangle. It
 * still gives the visitor the thing they came for: the caps, and their names.
 */
export default function NoWebGL() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-paper px-6 py-16">
      <h1 className="max-w-[14ch] text-center font-serif text-[clamp(3rem,11vw,6rem)] leading-[0.88] tracking-[-0.02em] text-ink">
        Drinks <em>of the</em> 2000&rsquo;s
      </h1>

      {/* eslint-disable-next-line @next/next/no-img-element -- next/image is
          unnecessary for a single static fallback and adds a runtime dependency
          on a path that is already degraded. */}
      <img
        src={SITE.ogImage.url}
        alt={SITE.ogImage.alt}
        width={SITE.ogImage.width}
        height={SITE.ogImage.height}
        className="w-full max-w-3xl border border-paper-edge"
      />

      <p className="max-w-[46ch] text-center text-[15px] leading-7 text-ink-2">
        This browser can&rsquo;t display the 3D caps, so here they are as a picture.
      </p>

      <ul className="flex max-w-2xl flex-wrap justify-center gap-x-5 gap-y-2">
        {CAPS.map((cap) => (
          <li key={cap.slug} className="text-[13px] text-ink">
            {cap.name}
            {cap.variant && <span className="text-ink-3"> {cap.variant}</span>}
          </li>
        ))}
      </ul>

      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-3">
        Caps by {SITE.creator} {SITE.creatorHandle}
      </p>
    </div>
  );
}
