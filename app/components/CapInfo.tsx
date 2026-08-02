'use client';

import type { Cap, Sourced } from '../data/caps';

/**
 * The info panel for a focused cap.
 *
 * Renders ONLY what has been verified. Every factual field is `Sourced<T>`, and a
 * field with no source is simply absent — no placeholder, no "unknown", no guess.
 * That is CLAUDE.md §8 made structural rather than a rule someone has to remember.
 */
/** Being visibly sourced is part of the credibility this project trades on. */
function Source({ url }: { url: string }) {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* not a URL — show it verbatim */
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[11px] text-ink-3 underline decoration-paper-edge underline-offset-2
                 transition-colors duration-150 ease-out hover:text-ink-2"
    >
      {host}
    </a>
  );
}

function Field({ label, field }: { label: string; field?: Sourced<string> }) {
  if (!field) return null;
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-3">{label}</dt>
      <dd className="text-[13px] text-ink">{field.value}</dd>
      <dd>
        <Source url={field.source} />
      </dd>
    </div>
  );
}

function CapInfo({
  cap,
  visible,
  onClose,
  ref,
}: {
  cap: Cap;
  visible: boolean;
  onClose: () => void;
  ref?: React.Ref<HTMLElement>;
}) {
  const facts = [
    ['Flavour', cap.flavour],
    ['Bottler', cap.bottler],
    ['Years', cap.years],
    ['Price then', cap.priceThen],
  ] as const;

  const hasAny = cap.blurb || cap.history || facts.some(([, f]) => f);

  return (
    <aside
      ref={ref}
      // Focus lands here when a cap opens, so a screen reader reads the panel rather
      // than staying parked on the canvas. Not reachable by Tab — it is programmatic.
      tabIndex={-1}
      aria-label={`${cap.name}${cap.variant ? ` ${cap.variant}` : ''}`}
      style={{
        transitionTimingFunction: 'var(--ease-out)',
        // Exits run faster than entrances, per the house motion rules.
        transitionDuration: visible ? '420ms' : '260ms',
        transitionDelay: visible ? '160ms' : '0ms',
      }}
      className={`pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex max-h-[56dvh] touch-auto
                  flex-col gap-5 overflow-y-auto overscroll-contain border-t border-paper-edge
                  bg-paper px-6 pb-7 pt-6
                  transition-[opacity,transform] will-change-transform
                  sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(30rem,42vw)]
                  sm:justify-center sm:overflow-visible sm:border-t-0 sm:bg-transparent sm:p-12
                  ${visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-[clamp(2.25rem,6vw,3.75rem)] leading-[0.95] tracking-[-0.02em] text-ink">
          {cap.name}
        </h2>
        {cap.variant && (
          <p className="font-serif text-[clamp(1.1rem,2.6vw,1.6rem)] italic leading-tight text-ink-2">
            {cap.variant}
          </p>
        )}
        {/* The reveal is the point of the whole thing, and on a phone the panel
            scrolls — so the hint sits with the title, never below the fold. */}
        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-ink-3">
          Tap the cap — or press Enter — to turn it over
        </p>
      </div>

      {cap.blurb && <p className="max-w-[52ch] text-[15px] leading-7 text-ink-2">{cap.blurb.value}</p>}

      {cap.history && (
        <div className="flex flex-col gap-1.5">
          <p className="max-w-[52ch] text-[15px] leading-7 text-ink-2">{cap.history.value}</p>
          <Source url={cap.history.source} />
        </div>
      )}

      {facts.some(([, f]) => f) && (
        <dl className="flex flex-col gap-4">
          {facts.map(([label, field]) => (
            <Field key={label} label={label} field={field} />
          ))}
        </dl>
      )}

      {cap.disputed && (
        <p className="max-w-[52ch] border-l border-rim/40 pl-3 text-[13px] leading-6 text-ink-2">
          {cap.disputed}
        </p>
      )}

      {!hasAny && (
        // Deliberate, not a stub: nothing about this drink has been sourced yet, and
        // inventing plausible history is exactly what CLAUDE.md §8 forbids.
        <p className="max-w-[46ch] border border-dashed border-paper-edge px-4 py-3 text-[13px] leading-6 text-ink-3">
          No verified history yet. Facts appear here once they have a source.
        </p>
      )}

      <button
        onClick={onClose}
        className="self-start text-[11px] uppercase tracking-[0.18em] text-ink-3
                   transition-[color,transform] duration-150 ease-out hover:text-ink active:scale-[0.97]"
      >
        Close
      </button>
    </aside>
  );
}

export default CapInfo;
