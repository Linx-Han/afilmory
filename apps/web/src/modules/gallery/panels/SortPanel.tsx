import { clsxm } from '@afilmory/utils'
import { useAtom } from 'jotai'
import { useTranslation } from 'react-i18next'

import { gallerySettingAtom } from '~/atoms/app'

interface SortOptionProps {
  icon: string
  label: string
  isActive: boolean
  onClick: () => void
}

const SortOption = ({ icon, label, isActive, onClick }: SortOptionProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsxm(
        'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors duration-200 lg:py-1',
        'hover:bg-[linear-gradient(to_right,color-mix(in_srgb,var(--color-accent)_8%,transparent),color-mix(in_srgb,var(--color-accent)_5%,transparent))]',
        'hover:text-accent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1',
      )}
    >
      <i className={icon} />
      <span>{label}</span>
      {isActive && <i className="i-mingcute-check-line ml-auto" />}
    </button>
  )
}

export const SortPanel = () => {
  const { t } = useTranslation()
  const [gallerySetting, setGallerySetting] = useAtom(gallerySettingAtom)

  const setSortOrder = (order: 'asc' | 'desc') => {
    setGallerySetting({
      ...gallerySetting,
      sortOrder: order,
    })
  }

  return (
    <div className="-mx-2 flex flex-col p-0 text-sm lg:p-0">
      <SortOption
        icon="i-mingcute-sort-descending-line"
        label={t('action.sort.newest.first')}
        isActive={gallerySetting.sortOrder === 'desc'}
        onClick={() => setSortOrder('desc')}
      />
      <SortOption
        icon="i-mingcute-sort-ascending-line"
        label={t('action.sort.oldest.first')}
        isActive={gallerySetting.sortOrder === 'asc'}
        onClick={() => setSortOrder('asc')}
      />
    </div>
  )
}
