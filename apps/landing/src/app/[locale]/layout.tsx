import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server'

import { NocturneBackground } from '~/components/landing/NocturneBackground'
import { Footer } from '~/components/layout'
import { PageHeader } from '~/components/layout/PageHeader'
import { Root } from '~/components/layout/root/Root'
import {
  buildAbsoluteUrl,
  createLanguageAlternates,
  FAVICON_PATH,
  FAVICON_URL,
  OG_IMAGE_URL,
  SITE_CONTACT_EMAIL,
  SITE_NAME,
  SITE_PUBLISHER,
  SITE_TAGLINE,
  SITE_URL,
} from '~/constants/seo'
import type { AppLocale } from '~/i18n/config'
import { defaultLocale, locales } from '~/i18n/config'
import { sansFont, serifFont } from '~/lib/fonts'

import { Providers } from '../../providers/root'
import { ClientInit } from '../ClientInit'
import { init } from '../init'
import { InitInClient } from '../InitInClient'

init()

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export function generateViewport(): Viewport {
  return {
    themeColor: [
      { media: '(prefers-color-scheme: dark)', color: '#000212' },
      { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    ],
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = (await params).locale as AppLocale
  const isSupported = locales.includes(locale)
  const targetLocale = isSupported ? locale : defaultLocale
  const languageAlternates = createLanguageAlternates()
  const canonicalUrl = languageAlternates[targetLocale]
  const t = await getTranslations({ locale: targetLocale, namespace: 'Meta' })

  const title = t('title')
  const description = t('description')
  const keywords = t('keywords')
  const keywordsList = keywords
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)

  return {
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates,
    },
    applicationName: SITE_NAME,
    category: 'Photography',
    title: {
      template: `%s - ${title}`,
      default: title,
    },
    description,
    keywords: keywordsList,
    authors: [{ name: SITE_PUBLISHER, url: SITE_URL }],
    creator: SITE_PUBLISHER,
    publisher: SITE_PUBLISHER,
    openGraph: {
      title: {
        default: title,
        template: `%s | ${title}`,
      },
      description,
      siteName: title,
      locale: targetLocale.replace('-', '_'),
      type: 'website',
      url: canonicalUrl,
      images: [
        {
          url: OG_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      site: SITE_NAME,
      creator: SITE_PUBLISHER,
      images: [OG_IMAGE_URL],
    },
    icons: {
      icon: FAVICON_PATH,
      shortcut: FAVICON_PATH,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const locale = (await params).locale as AppLocale

  if (!locales.includes(locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const [messages, metaTranslations] = await Promise.all([
    getMessages(),
    getTranslations({ locale, namespace: 'Meta' }),
  ])

  const canonicalUrl = buildAbsoluteUrl(`/${locale}`)
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}#organization`,
        name: SITE_PUBLISHER,
        url: SITE_URL,
        email: SITE_CONTACT_EMAIL,
        description: metaTranslations('description'),
        logo: FAVICON_URL,
      },
      {
        '@type': 'WebSite',
        name: metaTranslations('title'),
        url: canonicalUrl,
        description: metaTranslations('description'),
        inLanguage: locale,
        alternateName: SITE_TAGLINE,
        publisher: {
          '@id': `${SITE_URL}#organization`,
        },
      },
    ],
  }

  return (
    <>
      <ClientInit />
      <html lang={locale} suppressHydrationWarning>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
        </head>
        <body
          className={`${sansFont.variable} ${serifFont.variable} m-0 h-full p-0 font-sans`}
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Providers>
              <div data-theme>
                <Root>
                  <NocturneBackground />
                  <PageHeader />
                  {children}
                  <Footer />
                </Root>
              </div>
            </Providers>
          </NextIntlClientProvider>

          <InitInClient />
        </body>
      </html>
    </>
  )
}
