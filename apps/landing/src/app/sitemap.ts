import type { MetadataRoute } from 'next'

import { createLanguageAlternates, SITE_URL } from '~/constants/seo'
import type { AppLocale } from '~/i18n/config'
import { locales } from '~/i18n/config'

const STATIC_PATHS = ['/', '/privacy', '/terms'] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return STATIC_PATHS.flatMap((pathname) => {
    const translatedPath =
      pathname === '/' ? '' : (pathname as Exclude<typeof pathname, '/'>)
    const languageAlternates = createLanguageAlternates(translatedPath)

    return locales.map((locale) => ({
      url:
        languageAlternates[locale as AppLocale] ??
        new URL(`/${locale}${translatedPath}`, SITE_URL).toString(),
      lastModified,
      changeFrequency: pathname === '/' ? 'weekly' : 'monthly',
      priority: pathname === '/' ? 1 : 0.6,
      alternates: {
        languages: languageAlternates,
      },
    }))
  })
}
