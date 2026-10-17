import { Button } from '@afilmory/ui'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

type FooterProps = {
  disableBack: boolean
  isSubmitting: boolean
  isLastStep: boolean
  disableNext?: boolean
  onBack: () => void
  onNext: () => void
}

export const RegistrationFooter: FC<FooterProps> = ({
  disableBack,
  isSubmitting,
  isLastStep,
  disableNext,
  onBack,
  onNext,
}) => {
  const { t } = useTranslation()

  return (
    <footer className="flex flex-col gap-3 p-8 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <div />
      <div className="flex gap-2">
        {!disableBack && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            className="text-text-secondary hover:text-text hover:bg-fill/50 min-w-[140px]"
            onClick={onBack}
            disabled={isSubmitting}
          >
            {t('auth.registration.footer.back')}
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          size="md"
          className="min-w-40"
          onClick={onNext}
          isLoading={isSubmitting}
          disabled={disableNext}
        >
          {isLastStep ? t('auth.registration.footer.create_workspace') : t('auth.registration.footer.continue')}
        </Button>
      </div>
    </footer>
  )
}
