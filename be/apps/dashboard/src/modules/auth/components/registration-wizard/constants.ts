import type { TenantRegistrationFormState } from '~/modules/auth/hooks/useRegistrationForm'

export const REGISTRATION_STEPS = [
  {
    id: 'login',
  },
  {
    id: 'workspace',
  },
  {
    id: 'site',
  },
  {
    id: 'review',
  },
] as const satisfies ReadonlyArray<{
  id: 'login' | 'workspace' | 'site' | 'review'
}>

export type RegistrationStepId = (typeof REGISTRATION_STEPS)[number]['id']

export const STEP_FIELDS: Record<RegistrationStepId, Array<keyof TenantRegistrationFormState>> = {
  login: [],
  workspace: ['tenantName', 'tenantSlug'],
  site: [],
  review: ['termsAccepted'],
}

export const progressForStep = (index: number) => Math.round((index / (REGISTRATION_STEPS.length - 1 || 1)) * 100)
