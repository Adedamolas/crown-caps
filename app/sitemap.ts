import type { MetadataRoute } from 'next';
import { SITE_URL } from './site';

/**
 * Only the routes that actually exist. Focusing a cap is an in-page overlay, not a
 * route, so there is nothing else to list yet — listing `/cap/<slug>` URLs before
 * they resolve would hand crawlers a page of 404s.
 *
 * When the deep-linked detail route lands (MOTION.md §6), map CAPS to entries here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
