import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { useRegistrationSteps } from './useRegistrationSteps'

type HeaderProps = {
  currentStepIndex: number
}

export const RegistrationHeader: FC<HeaderProps> = ({ currentStepIndex }) => {
  const { t } = useTranslation()
  const steps = useRegistrationSteps()
  const step = steps[currentStepIndex]

  return (
    <header className="p-8 pb-6">
      <div className="bg-accent/10 text-accent inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium">
        {t('auth.registration.header.step_indicator', { current: currentStepIndex + 1, total: steps.length })}
      </div>
      <h1 className="text-text mt-4 text-3xl font-bold">{step.title}</h1>
      <p className="text-text-secondary mt-2 max-w-2xl text-sm">{step.description}</p>
    </header>
  )
}
