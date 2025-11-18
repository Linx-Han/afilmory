import type { MetadataRoute } from 'next'

import { buildAbsoluteUrl, SITE_HOST } from '~/constants/seo'

export const dynamic = 'force-static'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/feed'],
      },
    ],
    sitemap: buildAbsoluteUrl('/sitemap.xml'),
    host: SITE_HOST,
  }
}
