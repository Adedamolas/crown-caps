import { SITE } from '../site';

/**
 * Credit line. Two names, both of which have to survive the page being shared:
 * the caps are Rehoboth's work and the site is Adedamola's.
 *
 * Rendered outside the canvas so it exists for crawlers and screen readers, and
 * kept quiet enough not to compete with the field.
 */
export default function Credit() {
  return (
    <p className="pointer-events-auto absolute bottom-5 right-5 z-10 text-right text-[11px] uppercase leading-5 tracking-[0.18em] text-ink-3">
      <span className="block">
        Caps by{' '}
        <a
          href={SITE.creatorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-paper-edge underline-offset-2 transition-colors duration-150 ease-out hover:text-ink"
        >
          {SITE.creator}
        </a>
      </span>
      <span className="block">
        Built by{' '}
        <a
          href={SITE.authorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-paper-edge underline-offset-2 transition-colors duration-150 ease-out hover:text-ink"
        >
          {SITE.author}
        </a>
      </span>
    </p>
  );
}
