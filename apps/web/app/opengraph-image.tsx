import { ImageResponse } from 'next/og';

import { SITE_NAME } from '@/lib/site';

export const runtime = 'edge';

export const alt = `${SITE_NAME} — warm, practical parenting ideas`;

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

/**
 * Default Open Graph image for social previews (1200×630).
 * Per-page routes inherit unless they define their own opengraph-image.
 */
export default function OpengraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #E0FFF4 0%, #F3E8FF 42%, #FFF0F8 100%)',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 48,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #00A878 0%, #A020D8 55%, #F472B6 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 28,
              fontWeight: 600,
              color: '#1E293B',
              maxWidth: 920,
              lineHeight: 1.35,
            }}
          >
            Warm, practical parenting ideas — health, learning, emotions, play & family
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
