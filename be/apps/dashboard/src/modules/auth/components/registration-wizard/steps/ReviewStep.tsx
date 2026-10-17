import { Checkbox, FormError } from '@afilmory/ui'
import { cx, Spring } from '@afilmory/utils'
import { m } from 'motion/react'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  TenantRegistrationFormState,
  TenantSiteFieldKey,
  useRegistrationForm,
} from '~/modules/auth/hooks/useRegistrationForm'
import type { BetterAuthUser } from '~/modules/auth/types'
import type { SchemaFormValue, UiFieldNode, UiSchema } from '~/modules/schema-form/types'

import { collectSiteFields, firstErrorMessage } from '../utils'

type ReviewStepProps = {
  form: ReturnType<typeof useRegistrationForm>
  values: TenantRegistrationFormState
  authUser: BetterAuthUser | null
  siteSchema: UiSchema<string> | null
  siteSchemaLoading: boolean
  siteSchemaError?: string
  isSubmitting: boolean
  serverError: string | null
  onFieldInteraction: () => void
}

export const ReviewStep: FC<ReviewStepProps> = ({
  form,
  values,
  authUser,
  siteSchema,
  siteSchemaLoading,
  siteSchemaError,
  isSubmitting,
  serverError,
  onFieldInteraction,
}) => {
  const { t } = useTranslation()

  const formatSiteValue = (value: SchemaFormValue | undefined) => {
    if (typeof value === 'boolean') {
      return value
        ? t('auth.registration.common.enabled', 'Enabled')
        : t('auth.registration.common.disabled', 'Disabled')
    }
    if (value == null) {
      return '—'
    }
    const text = String(value).trim()
    return text || '—'
  }

  const siteSummary = useMemo(() => {
    if (!siteSchema) {
      return [] as Array<{ field: UiFieldNode<string>; value: SchemaFormValue | undefined }>
    }

    return collectSiteFields(siteSchema.sections).map((field) => {
      const key = field.key as TenantSiteFieldKey
      return {
        field,
        value: values[key],
      }
    })
  }, [siteSchema, values])

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-text text-lg font-semibold">{t('auth.registration.steps.review.title_confirm')}</h2>
        <p className="text-text-secondary text-sm">{t('auth.registration.steps.review.description_confirm')}</p>
      </section>
      <dl className="bg-fill/40 grid gap-x-6 gap-y-4 rounded-2xl border border-white/5 p-6 md:grid-cols-2">
        <div>
          <dt className="text-text-tertiary text-xs tracking-wide uppercase">
            {t('auth.registration.steps.review.label_workspace_name')}
          </dt>
          <dd className="text-text mt-1 text-sm font-medium">{values.tenantName || '—'}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary text-xs tracking-wide uppercase">
            {t('auth.registration.steps.review.label_workspace_slug')}
          </dt>
          <dd className="text-text mt-1 text-sm font-medium">{values.tenantSlug || '—'}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary text-xs tracking-wide uppercase">
            {t('auth.registration.steps.review.label_admin_name')}
          </dt>
          <dd className="text-text mt-1 text-sm font-medium">{authUser?.name || authUser?.email || '—'}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary text-xs tracking-wide uppercase">
            {t('auth.registration.steps.review.label_admin_email')}
          </dt>
          <dd className="text-text mt-1 text-sm font-medium">{authUser?.email || '—'}</dd>
        </div>
      </dl>

      <section className="space-y-4">
        <h3 className="text-text text-base font-semibold">
          {t('auth.registration.steps.review.section_site_details')}
        </h3>
        {siteSchemaLoading && <div className="bg-fill/40 h-32 animate-pulse rounded-2xl border border-white/5" />}
        {!siteSchemaLoading && siteSchemaError && (
          <div className="border-red/60 bg-red/10 text-red rounded-2xl border px-4 py-3 text-sm">{siteSchemaError}</div>
        )}
        {!siteSchemaLoading && !siteSchemaError && siteSchema && (
          <dl className="bg-fill/40 grid gap-x-6 gap-y-4 rounded-2xl border border-white/5 p-6 md:grid-cols-2">
            {siteSummary.map(({ field, value }) => {
              const spanClass = field.component?.type === 'textarea' ? 'md:col-span-2' : ''
              const isMono = field.key === 'site.accentColor'

              return (
                <div key={field.id} className={cx(spanClass, 'min-w-0')}>
                  <dt className="text-text-tertiary text-xs tracking-wide uppercase">{field.title}</dt>
                  <dd
                    className={cx(
                      'text-text mt-1 text-sm font-medium wrap-break-word',
                      isMono && 'font-mono text-xs tracking-wide text-text-secondary',
                    )}
                  >
                    {formatSiteValue(value)}
                  </dd>
                </div>
              )
            })}
          </dl>
        )}
      </section>

      {serverError && (
        <m.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={Spring.presets.snappy}
          className="border-red/60 bg-red/10 rounded-xl border px-4 py-3"
        >
          <p className="text-red text-sm">{serverError}</p>
        </m.div>
      )}

      <section className="space-y-3">
        <h3 className="text-text text-base font-semibold">{t('auth.registration.steps.review.section_policies')}</h3>
        <p className="text-text-tertiary text-sm">{t('auth.registration.steps.review.policies_description')}</p>
        <div className="space-y-2">
          <form.Field name="termsAccepted">
            {(field) => {
              const error = firstErrorMessage(field.state.meta.errors)
              return (
                <>
                  <label className="text-text flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={field.state.value}
                      onCheckedChange={(checked) => {
                        onFieldInteraction()
                        field.handleChange(checked === true)
                      }}
                      disabled={isSubmitting}
                      className="mt-0.5"
                    />
                    <span className="text-text-secondary">
                      {t('auth.registration.steps.review.terms_agree_pre')}{' '}
                      <a href="/terms" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        {t('auth.registration.steps.review.terms_link')}
                      </a>{' '}
                      {t('auth.registration.steps.review.terms_and')}{' '}
                      <a href="/privacy" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        {t('auth.registration.steps.review.privacy_link')}
                      </a>
                      .
                    </span>
                  </label>
                  <FormError>{error}</FormError>
                </>
              )
            }}
          </form.Field>
        </div>
      </section>
    </div>
  )
}
