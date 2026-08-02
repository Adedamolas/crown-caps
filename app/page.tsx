import CapGrid from './components/CapGridClient';
import Credit from './components/Credit';
import { CAPS } from './data/caps';
import { SITE, SITE_URL } from './site';

/**
 * Structured data. Without this a crawler sees a `<canvas>` and nothing else.
 * ItemList gives the caps themselves a chance to surface in search.
 */
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE.name,
      description: SITE.description,
      inLanguage: SITE.lang,
      creator: {
        '@type': 'Person',
        name: SITE.creator,
        alternateName: SITE.creatorHandle,
        url: SITE.creatorUrl,
      },
    },
    {
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/#collection`,
      url: `${SITE_URL}/`,
      name: SITE.title,
      description: SITE.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      primaryImageOfPage: `${SITE_URL}${SITE.ogImage.url}`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: CAPS.length,
        itemListElement: CAPS.map((cap, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: cap.variant ? `${cap.name} (${cap.variant})` : cap.name,
          url: `${SITE_URL}/cap/${cap.slug}`,
        })),
      },
    },
  ],
};

export default function Home() {
  return (
    <main className="relative flex-1">
      <script
        type="application/ld+json"
        // Content is built from local constants, never user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/*
        Text content for crawlers and screen readers. The grid is a WebGL canvas and
        is invisible to both. Visually hidden, NOT `display: none`, so assistive tech
        still reaches it. Nothing in here is focusable — see the nav below.
      */}
      <div className="sr-only">
        <h1>{SITE.title}</h1>
        <p>{SITE.description}</p>
        <p>
          3D crown caps modelled, textured and animated by {SITE.creator} ({SITE.creatorHandle}).
          Site built by {SITE.author}.
        </p>
      </div>

      {/*
        The whole site, navigable without a pointer: fourteen links, each to a page
        carrying that cap's sourced history.

        `focus-within:not-sr-only` matters. A focusable element inside an `sr-only`
        container cannot escape its clipping, so a sighted keyboard user would Tab
        into elements they cannot see and lose the focus ring entirely. Revealing the
        list on focus is the skip-link pattern, and it is the difference between this
        being an accessibility feature and an accessibility trap.
      */}
      <nav
        aria-label="All caps"
        className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-4
                   focus-within:top-4 focus-within:z-50 focus-within:flex focus-within:max-h-[80dvh]
                   focus-within:flex-col focus-within:gap-1 focus-within:overflow-y-auto
                   focus-within:border focus-within:border-paper-edge focus-within:bg-paper
                   focus-within:p-4 focus-within:shadow-sm"
      >
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-ink-3">Caps in this collection</h2>
        <ul className="flex flex-col gap-0.5">
          {CAPS.map((cap) => (
            <li key={cap.slug}>
              <a
                href={`/cap/${cap.slug}`}
                className="text-[13px] text-ink underline decoration-paper-edge underline-offset-2
                           outline-none focus-visible:ring-2 focus-visible:ring-rim/50"
              >
                {cap.variant ? `${cap.name} — ${cap.variant}` : cap.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Credit />

      <CapGrid />
    </main>
  );
}
