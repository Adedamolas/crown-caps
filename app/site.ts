/**
 * Single source of truth for site-level metadata. Imported by layout, sitemap,
 * robots and the JSON-LD block so these can never drift apart.
 */

/**
 * ⚠️ Set `NEXT_PUBLIC_SITE_URL` in the deployment environment before launch.
 * Absolute URLs in Open Graph tags are not optional — crawlers and social
 * scrapers will not resolve a relative image path, so an unset value here means
 * link previews silently break.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://crown-caps.vercel.app'
).replace(/\/$/, '');

export const SITE = {
  name: 'Crown Caps',
  title: 'Crown Caps — the bottle caps of 2000s Nigerian soft drinks',
  shortTitle: 'Crown Caps',
  description:
    'Spin the crown caps of the soft drinks Nigeria grew up on — Gold Spot, Limca, ' +
    'Fanta, 7up, Schweppes and more, in 3D. A nostalgia tribute with sourced history.',
  locale: 'en_NG',
  lang: 'en-NG',

  /**
   * ⚠️ CLAUDE.md §2: the credit arrangement with Rehoboth is still TBD and must be
   * locked before this ships publicly. This is the working attribution, not a final
   * credit line — confirm the wording with him.
   */
  creator: 'Rehoboth',
  creatorHandle: '@rehobothige_',
  creatorUrl: 'https://x.com/rehobothige_',

  ogImage: {
    url: '/og.png',
    width: 1920,
    height: 967,
    alt: 'A grid of 3D crown caps from early-2000s soft drinks — Fanta, Sprite, Pepsi, Limca, Schweppes, Crush and a ₦25 7up cap.',
  },

  keywords: [
    'crown caps',
    'bottle caps',
    'Nigerian nostalgia',
    'Nigeria 2000s',
    'soft drinks Nigeria',
    'Gold Spot',
    'Limca',
    '7up Nigeria',
    'Fanta Nigeria',
    'Schweppes Bitter Lemon',
    '3D bottle caps',
    'Nigerian childhood',
    'retro soft drinks',
  ],
} as const;
