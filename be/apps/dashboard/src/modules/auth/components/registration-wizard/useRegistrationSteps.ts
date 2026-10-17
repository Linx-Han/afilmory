import { useTranslation } from 'react-i18next'

import { REGISTRATION_STEPS } from './constants'

export const useRegistrationSteps = () => {
  const { t } = useTranslation()

  return REGISTRATION_STEPS.map((step) => ({
    ...step,
    title: t(`auth.registration.steps.${step.id}.title`),
    description: t(`auth.registration.steps.${step.id}.description`),
  }))
}
