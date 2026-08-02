import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CapGrid from '../../components/CapGridClient';
import Credit from '../../components/Credit';
import { CAPS } from '../../data/caps';
import { SITE } from '../../site';

/** All 14 caps are prerendered — there is nothing dynamic about a fixed catalogue. */
export function generateStaticParams() {
  return CAPS.map((cap) => ({ slug: cap.slug }));
}

const find = (slug: string) => CAPS.find((c) => c.slug === slug);

const fullName = (slug: string) => {
  const cap = find(slug);
  if (!cap) return SITE.name;
  return cap.variant ? `${cap.name} ${cap.variant}` : cap.name;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cap = find(slug);
  if (!cap) return {};

  const name = fullName(slug);
  // Prefer the cap's own sourced history — a real fact beats a generic tagline in a
  // search result. Fall back to the site line only when nothing is sourced yet.
  const description = cap.history?.value ?? cap.blurb?.value ?? SITE.description;

  return {
    title: name,
    description,
    alternates: { canonical: `/cap/${slug}` },
    openGraph: {
      type: 'article',
      url: `/cap/${slug}`,
      siteName: SITE.name,
      locale: SITE.locale,
      title: `${name} — ${SITE.shortTitle}`,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — ${SITE.shortTitle}`,
      description,
    },
  };
}

export default async function CapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cap = find(slug);
  if (!cap) notFound();

  return (
    <main className="relative flex-1">
      {/*
        The crawlable layer for this cap. The grid is a WebGL canvas and this route
        exists to be shared and indexed, so the facts have to be in the HTML.
      */}
      <div className="sr-only">
        <h1>{fullName(slug)}</h1>
        {cap.history && <p>{cap.history.value}</p>}
        {cap.blurb && <p>{cap.blurb.value}</p>}
        <dl>
          {cap.flavour && (
            <>
              <dt>Flavour</dt>
              <dd>{cap.flavour.value}</dd>
            </>
          )}
          {cap.bottler && (
            <>
              <dt>Bottler</dt>
              <dd>{cap.bottler.value}</dd>
            </>
          )}
          {cap.years && (
            <>
              <dt>Years</dt>
              <dd>{cap.years.value}</dd>
            </>
          )}
          {cap.priceThen && (
            <>
              <dt>Price</dt>
              <dd>{cap.priceThen.value}</dd>
            </>
          )}
        </dl>
        {cap.disputed && <p>{cap.disputed}</p>}
      </div>

      <Credit />

      <CapGrid initialSlug={slug} />
    </main>
  );
}
