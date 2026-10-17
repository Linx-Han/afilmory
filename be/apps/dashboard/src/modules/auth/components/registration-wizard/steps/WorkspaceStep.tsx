import { FormError, Input, Label } from '@afilmory/ui'
import { useStore } from '@tanstack/react-form'
import type { FC, MutableRefObject } from 'react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import type { useRegistrationForm } from '~/modules/auth/hooks/useRegistrationForm'
import { slugify } from '~/modules/welcome/utils'

import { firstErrorMessage } from '../utils'

const titleCaseFromSlug = (slug: string) =>
  slug
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

type WorkspaceStepProps = {
  form: ReturnType<typeof useRegistrationForm>
  slugManuallyEditedRef: MutableRefObject<boolean>
  lockedTenantSlug?: string | null
  isSubmitting: boolean
  onFieldInteraction: () => void
}

export const WorkspaceStep: FC<WorkspaceStepProps> = ({
  form,
  slugManuallyEditedRef,
  lockedTenantSlug,
  isSubmitting,
  onFieldInteraction,
}) => {
  const { t } = useTranslation()
  const slugValue = useStore(form.store, (state) => state.values.tenantSlug)
  const tenantNameValue = useStore(form.store, (state) => state.values.tenantName)
  const tenantNameAutofilledRef = useRef(false)

  useEffect(() => {
    if (tenantNameAutofilledRef.current || !slugValue) {
      return
    }
    if (tenantNameValue) {
      tenantNameAutofilledRef.current = true
      return
    }
    const derivedName = titleCaseFromSlug(slugValue)
    if (derivedName) {
      form.setFieldValue('tenantName', () => derivedName)
      tenantNameAutofilledRef.current = true
    }
  }, [form, slugValue, tenantNameValue])

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-text text-lg font-semibold">{t('auth.registration.steps.workspace.basics_title')}</h2>
        <p className="text-text-secondary text-sm">{t('auth.registration.steps.workspace.basics_description')}</p>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <form.Field name="tenantName">
          {(field) => {
            const error = firstErrorMessage(field.state.meta.errors)

            return (
              <div className="space-y-2">
                <Label htmlFor={field.name}>{t('auth.registration.steps.workspace.label_name')}</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    onFieldInteraction()
                    const nextValue = event.currentTarget.value
                    field.handleChange(nextValue)
                    if (!slugManuallyEditedRef.current) {
                      const nextSlug = slugify(nextValue)
                      if (nextSlug !== form.getFieldValue('tenantSlug')) {
                        form.setFieldValue('tenantSlug', () => nextSlug)
                        void form.validateField('tenantSlug', 'change')
                      }
                    }
                  }}
                  onBlur={field.handleBlur}
                  placeholder="Acme Studio"
                  disabled={isSubmitting}
                  error={Boolean(error)}
                  autoComplete="organization"
                />
                <FormError>{error}</FormError>
              </div>
            )
          }}
        </form.Field>
        <form.Field name="tenantSlug">
          {(field) => {
            const error = firstErrorMessage(field.state.meta.errors)
            const isSlugLocked = Boolean(lockedTenantSlug)
            const helperText = isSlugLocked
              ? t('auth.registration.steps.workspace.slug_locked_helper')
              : t('auth.registration.steps.workspace.slug_helper')

            return (
              <div className="space-y-2">
                <Label htmlFor={field.name}>{t('auth.registration.steps.workspace.label_slug')}</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    if (isSlugLocked) {
                      return
                    }
                    onFieldInteraction()
                    slugManuallyEditedRef.current = true
                    field.handleChange(event.currentTarget.value)
                  }}
                  onBlur={field.handleBlur}
                  placeholder="acme"
                  disabled={isSubmitting || isSlugLocked}
                  readOnly={isSlugLocked}
                  error={Boolean(error)}
                  autoComplete="off"
                />
                <p className="text-text-tertiary text-xs">{helperText}</p>
                <FormError>{error}</FormError>
              </div>
            )
          }}
        </form.Field>
      </div>
    </div>
  )
}
