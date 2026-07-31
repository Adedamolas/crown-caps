import type { MetadataRoute } from 'next';
import { SITE_URL } from './site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Nothing to hide, but keep build artefacts out of the index.
      disallow: ['/_next/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
