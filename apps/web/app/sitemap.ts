import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

const languageAlternates = {
  en: `${SITE_URL}/en`,
  bn: `${SITE_URL}/bn`,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${SITE_URL}/en`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
      alternates: {
        languages: languageAlternates,
      },
    },
    {
      url: `${SITE_URL}/bn`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
      alternates: {
        languages: languageAlternates,
      },
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
