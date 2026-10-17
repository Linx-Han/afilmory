import { Button } from '@afilmory/ui'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { usePhotoSyncAutoRunValue, useSetPhotoSyncAutoRun } from '~/atoms/photo-sync'
import { useMainPageLayout } from '~/components/layouts/MainPageLayout'
import { getRequestErrorMessage } from '~/lib/errors'
import { presentBillingUpgradeModal, resolveBillingUpgradeCategory } from '~/modules/billing/upgrade-prompts'

import { runPhotoSync } from '../../api'
import type { RunPhotoSyncPayload } from '../../types'
import { usePhotoSyncController } from './PhotoSyncControllerContext'

const photoSyncActionKeys = {
  toastSuccessPreview: 'photos.sync.actions.toast.preview-success',
  toastSuccessApply: 'photos.sync.actions.toast.apply-success',
  toastSuccessDescription: 'photos.sync.actions.toast.success-description',
  toastErrorTitle: 'photos.sync.actions.toast.error-title',
  toastErrorDescription: 'photos.sync.actions.toast.error-description',
  buttonPreview: 'photos.sync.actions.button.preview',
  buttonApply: 'photos.sync.actions.button.apply',
} as const satisfies Record<
  | 'toastSuccessPreview'
  | 'toastSuccessApply'
  | 'toastSuccessDescription'
  | 'toastErrorTitle'
  | 'toastErrorDescription'
  | 'buttonPreview'
  | 'buttonApply',
  I18nKeys
>

export function PhotoSyncActions() {
  const { t } = useTranslation()
  const { onCompleted, onProgress, onError } = usePhotoSyncController()
  const { setHeaderActionState } = useMainPageLayout()
  const [pendingMode, setPendingMode] = useState<'dry-run' | 'apply' | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const autoRunMode = usePhotoSyncAutoRunValue()
  const setAutoRunMode = useSetPhotoSyncAutoRun()

  const mutation = useMutation({
    mutationFn: async (variables: RunPhotoSyncPayload) => {
      const controller = new AbortController()
      abortRef.current = controller

      try {
        return await runPhotoSync(
          { dryRun: variables.dryRun ?? false },
          {
            signal: controller.signal,
            onEvent: onProgress,
          },
        )
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
      }
    },
    onMutate: (variables) => {
      setPendingMode(variables.dryRun ? 'dry-run' : 'apply')
      setHeaderActionState({ disabled: true, loading: true })
    },
    onSuccess: (data, variables) => {
      onCompleted(data, { dryRun: variables.dryRun ?? false })
      const { inserted, updated, conflicts, errors } = data.summary
      toast.success(
        variables.dryRun ? t(photoSyncActionKeys.toastSuccessPreview) : t(photoSyncActionKeys.toastSuccessApply),
        {
          description: t(photoSyncActionKeys.toastSuccessDescription, {
            inserted,
            updated,
            conflicts,
            errors,
          }),
        },
      )
    },
    onError: (error) => {
      const normalizedError = error instanceof Error ? error : new Error(t(photoSyncActionKeys.toastErrorDescription))
      const upgradeCategory = resolveBillingUpgradeCategory(error)
      if (upgradeCategory) {
        presentBillingUpgradeModal(upgradeCategory)
      }

      const message = getRequestErrorMessage(error, normalizedError.message)
      toast.error(t(photoSyncActionKeys.toastErrorTitle), { description: message })
      onError(normalizedError)
    },
    onSettled: () => {
      setPendingMode(null)
      setHeaderActionState({ disabled: false, loading: false })
      abortRef.current = null
    },
  })

  const { isPending, mutate } = mutation

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      setHeaderActionState({ disabled: false, loading: false })
    }
  }, [setHeaderActionState])

  useEffect(() => {
    if (!autoRunMode) {
      return
    }
    if (isPending) {
      return
    }
    mutate({ dryRun: autoRunMode === 'dry-run' })
    setAutoRunMode(null)
  }, [autoRunMode, isPending, mutate, setAutoRunMode])

  const handleSync = (dryRun: boolean) => {
    mutation.mutate({ dryRun })
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        isLoading={isPending && pendingMode === 'dry-run'}
        onClick={() => handleSync(true)}
      >
        {t(photoSyncActionKeys.buttonPreview)}
      </Button>
      <Button
        type="button"
        variant="primary"
        size="sm"
        disabled={isPending}
        isLoading={isPending && pendingMode === 'apply'}
        onClick={() => handleSync(false)}
      >
        {t(photoSyncActionKeys.buttonApply)}
      </Button>
    </div>
  )
}
