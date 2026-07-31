import CapGrid from './components/CapGridClient';
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
        The crawlable layer. The grid is a WebGL canvas, which is invisible to search
        engines and to screen readers alike — this gives both the real content, and a
        genuine H1 for the page. Visually hidden, NOT `display: none`, so assistive
        tech still reaches it.
      */}
      <div className="sr-only">
        <h1>{SITE.title}</h1>
        <p>{SITE.description}</p>
        <h2>Caps in this collection</h2>
        <ul>
          {CAPS.map((cap) => (
            <li key={cap.slug}>
              {cap.variant ? `${cap.name} — ${cap.variant}` : cap.name}
              {cap.history ? `. ${cap.history.value}` : null}
            </li>
          ))}
        </ul>
        <p>
          3D crown caps modelled, textured and animated by {SITE.creator} ({SITE.creatorHandle}).
        </p>
      </div>

      <CapGrid />
    </main>
  );
}
