import { clsxm } from '@afilmory/utils'
import type { ReactNode } from 'react'

interface ShareActionButtonProps {
  icon: string
  label: string | ReactNode
  onClick: () => void | Promise<void>
  disabled?: boolean
  title?: string
  className?: string
}

export const ShareActionButton = ({
  icon,
  label,
  onClick,
  disabled = false,
  title,
  className,
}: ShareActionButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsxm(
        'glassmorphic-btn flex flex-col items-center gap-1.5 rounded border-white/10 bg-white/5 px-2 py-2.5 text-xs text-white/80',
        'transition-all duration-200',
        'hover:border-white/20 hover:bg-white/8 hover:text-white',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-white/10 disabled:hover:bg-white/5',
        className,
      )}
      title={title}
    >
      <i className={clsxm(icon, 'text-lg text-white')} />
      <span className="w-full truncate text-center text-[10px] leading-tight text-white!">{label}</span>
    </button>
  )
}
