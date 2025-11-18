import type { AppLocale } from '~/i18n/config'
import { locales } from '~/i18n/config'

export const SITE_URL = 'https://afilmory.art'
export const SITE_NAME = 'Afilmory'
export const SITE_PUBLISHER = 'Afilmory Studio'
export const SITE_CONTACT_EMAIL = 'support@afilmory.art'
export const SITE_TAGLINE =
  'Immersive storytelling experiences for photographers, curators, and brands.'

export const OG_IMAGE_PATH = '/opengraph-image'
export const FAVICON_PATH = '/favicon.ico'

const ensureLeadingSlash = (path: string) => {
  if (!path) return '/'
  return path.startsWith('/') ? path : `/${path}`
}

export const buildAbsoluteUrl = (path = '/') => {
  if (path.startsWith('http')) {
    return path
  }

  const normalizedPath =
    path === '' || path === '/' ? '/' : ensureLeadingSlash(path)

  return new URL(normalizedPath, SITE_URL).toString()
}

export const OG_IMAGE_URL = buildAbsoluteUrl(OG_IMAGE_PATH)
export const FAVICON_URL = buildAbsoluteUrl(FAVICON_PATH)
export const SITE_HOST = new URL(SITE_URL).host

export const createLanguageAlternates = (
  pathname = '',
  localeList: readonly AppLocale[] = locales,
): Record<AppLocale, string> => {
  const normalizedPath =
    pathname === '' ? '' : pathname.startsWith('/') ? pathname : `/${pathname}`

  return localeList.reduce(
    (acc, locale) => {
      const localizedSegment =
        normalizedPath === '' ? `/${locale}` : `/${locale}${normalizedPath}`
      acc[locale] = buildAbsoluteUrl(localizedSegment)
      return acc
    },
    {} as Record<AppLocale, string>,
  )
}
