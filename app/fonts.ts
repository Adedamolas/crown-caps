import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';

/**
 * Every font in one place, so the family names are importable rather than sniffed
 * out of the DOM.
 *
 * That matters because the hero type is drawn into a CANVAS texture. Canvas has no
 * connection to CSS: it cannot read a custom property, and `fillText` does not
 * trigger a font download the way rendering DOM text does. Reaching the face from
 * a canvas needs two things this module provides:
 *
 *   1. the real family name — `instrumentSerif.style.fontFamily`
 *   2. something to pass to `document.fonts.load()`, which is what actually fetches it
 *
 * Without (2) the font is never requested at all, `document.fonts.ready` resolves
 * immediately, and the canvas silently bakes a system fallback.
 */

export const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/**
 * Display face — high-contrast editorial serif with a true italic. Slim, which is
 * the look this project wants (DESIGN.md §4).
 *
 * ⚠️ The variable is `--font-display`, NOT `--font-serif`. `--font-serif` is the
 * Tailwind theme token; pointing the token at a variable of the same name makes it
 * self-referential, and CSS silently discards it.
 */
export const instrumentSerif = Instrument_Serif({
  variable: '--font-display',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
});

/** Family name as the browser knows it, e.g. `'Instrument Serif', 'Instrument Serif Fallback'`. */
export const SERIF_FAMILY = instrumentSerif.style.fontFamily;
export const SANS_FAMILY = geistSans.style.fontFamily;

export const FONT_VARIABLES = [
  geistSans.variable,
  geistMono.variable,
  instrumentSerif.variable,
].join(' ');
