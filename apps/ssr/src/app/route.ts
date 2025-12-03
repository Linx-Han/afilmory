import { DOMParser } from 'linkedom'
import type { NextRequest } from 'next/server'

import { injectConfigToDocument } from '~/lib/injectable'

export const GET = handle
export const HEAD = handle
export const OPTIONS = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle

async function handle(req: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    return import('./dev').then((m) => m.handler(req))
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response(null, { status: 404 })
  }

  const acceptHtml = req.headers.get('accept')?.includes('text/html')
  if (!acceptHtml) return new Response(null, { status: 404 })

  return renderIndex()
}

async function renderIndex() {
  // 原始正确路径（位于 ssr output 内）
  const indexHtml = await import('../index.html').then((m) => m.default)

  const document = new DOMParser().parseFromString(indexHtml, 'text/html')
  injectConfigToDocument(document)

  return new Response(document.documentElement.outerHTML, {
    headers: {
      'Content-Type': 'text/html',
      'X-SSR': '1',
    },
  })
}
