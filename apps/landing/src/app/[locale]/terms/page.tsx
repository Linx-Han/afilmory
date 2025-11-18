import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { Metadata } from 'next'

import { MarkdownContent } from '~/components/common/MarkdownContent'
import { NormalContainer } from '~/components/layout/container/Normal'
import {
  buildAbsoluteUrl,
  createLanguageAlternates,
  OG_IMAGE_URL,
  SITE_NAME,
} from '~/constants/seo'
import type { AppLocale } from '~/i18n/config'

const PAGE_SEGMENT = '/terms'
const PAGE_TITLE = 'Terms of Service'
const PAGE_DESCRIPTION = 'Legal terms for using the Afilmory platform.'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = (await params).locale as AppLocale
  const languageAlternates = createLanguageAlternates(PAGE_SEGMENT)
  const canonicalUrl =
    languageAlternates[locale] ?? buildAbsoluteUrl(`/${locale}${PAGE_SEGMENT}`)

  return {
    title: `${PAGE_TITLE} · ${SITE_NAME}`,
    description: PAGE_DESCRIPTION,
    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates,
    },
    openGraph: {
      title: `${PAGE_TITLE} | ${SITE_NAME}`,
      description: PAGE_DESCRIPTION,
      url: canonicalUrl,
      type: 'article',
      images: [
        {
          url: OG_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: PAGE_TITLE,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${PAGE_TITLE} · ${SITE_NAME}`,
      description: PAGE_DESCRIPTION,
      images: [OG_IMAGE_URL],
    },
  }
}

export default async function TermsPage() {
  const cwd = process.cwd()
  const filePath =
    cwd.endsWith('apps/landing') || cwd.endsWith('apps/landing/')
      ? resolve(cwd, 'src/legal/tos.md')
      : resolve(cwd, 'apps/landing/src/legal/tos.md')
  const content = await readFile(filePath, 'utf-8')

  return (
    <div className="relative min-h-screen text-white">
      <NormalContainer>
        <article className="py-16">
          <MarkdownContent content={content} />
        </article>
      </NormalContainer>
    </div>
  )
}
