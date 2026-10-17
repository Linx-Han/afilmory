import { Button, LinearBorderContainer } from '@afilmory/ui'
import { repository } from '@pkg'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, useRouteError } from 'react-router'

import { attachOpenInEditor } from '~/lib/dev'

export function ErrorElement() {
  const error = useRouteError()
  const { t } = useTranslation()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : JSON.stringify(error)
  const stack = error instanceof Error ? error.stack : null

  useEffect(() => {
    console.error('Error handled by React Router default ErrorBoundary:', error)
  }, [error])

  const reloadTriggeredRef = useRef(false)
  const shouldAttemptReload =
    message.startsWith('Failed to fetch dynamically imported module') && window.sessionStorage.getItem('reload') !== '1'

  useEffect(() => {
    if (!shouldAttemptReload || reloadTriggeredRef.current) {
      return
    }

    reloadTriggeredRef.current = true
    window.sessionStorage.setItem('reload', '1')
    window.location.reload()
  }, [shouldAttemptReload])

  if (shouldAttemptReload) {
    return null
  }

  return (
    <div className="bg-background text-text relative flex min-h-dvh flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <LinearBorderContainer>
          <div className="relative w-full max-w-[640px] overflow-hidden border border-white/5">
            {/* Glassmorphic background effects */}
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute -inset-32 bg-linear-to-br from-red-500/20 via-transparent to-transparent blur-3xl" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />
            </div>

            <div className="relative p-10 sm:p-12">
              <div>
                <p className="mb-3 text-xs font-semibold tracking-[0.55em] text-red-400 uppercase">Error</p>
                <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">{t('error.boundary.title')}</h1>
                <p className="text-text-secondary mb-6 text-base leading-relaxed">{t('error.boundary.description')}</p>

                <div className="bg-material-medium/40 border-fill-tertiary mb-6 rounded-2xl border px-5 py-4 text-sm">
                  <p className="text-text-secondary font-mono break-words">{message}</p>
                  {import.meta.env.DEV && stack && (
                    <div className="mt-4 overflow-auto">
                      <pre className="font-mono text-xs break-words whitespace-pre-wrap text-red-400">
                        {attachOpenInEditor(stack)}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="primary"
                    className="glassmorphic-btn flex-1"
                    onClick={() => (window.location.href = '/')}
                  >
                    {t('error.boundary.reload')}
                  </Button>
                  <Button variant="ghost" className="flex-1" onClick={() => window.history.back()}>
                    {t('error.boundary.go-back')}
                  </Button>
                </div>

                <div className="mt-8 text-center sm:text-left">
                  <p className="text-text-secondary mb-2 text-sm">{t('error.boundary.help')}</p>
                  <a
                    href={`${repository.url}/issues/new?title=${encodeURIComponent(
                      `Error: ${message}`,
                    )}&body=${encodeURIComponent(
                      `### Error\n\n${message}\n\n### Stack\n\n\`\`\`\n${stack}\n\`\`\``,
                    )}&label=bug`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-text-secondary hover:text-text inline-flex items-center text-sm transition-colors"
                  >
                    <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                    </svg>
                    {t('error.boundary.report')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </LinearBorderContainer>
      </div>
    </div>
  )
}
