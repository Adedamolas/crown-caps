import type { MetadataRoute } from 'next';
import { CAPS } from './data/caps';
import { SITE_URL } from './site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    // One entry per cap. These are real prerendered routes with their own metadata
    // and Open Graph card, so they are worth indexing individually.
    ...CAPS.map((cap) => ({
      url: `${SITE_URL}/cap/${cap.slug}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.8,
    })),
  ];
}
