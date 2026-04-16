import type { MetadataRoute } from 'next';

import { SITE_NAME, SITE_URL } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'PMK',
    description:
      'Warm, practical parenting ideas—health, learning, emotions, play, and family connection.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FAFAFF',
    theme_color: '#00A878',
    lang: 'en',
    icons: [
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    id: SITE_URL,
  };
}
