export function resolveSocialUrl(
  value: string,
  { baseUrl, stripAt }: { baseUrl: string; stripAt?: boolean },
): string | undefined {
  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  const normalized = stripAt ? trimmed.replace(/^@/, '') : trimmed
  if (!normalized) {
    return undefined
  }
  return `${baseUrl}${normalized}`
}

// 小型社交按钮样式（用于 PageHeaderRight）
export const SocialIconButton = ({ icon, title, href }: { icon: string; title: string; href: string }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex size-6 items-center justify-center rounded text-white/40 transition-colors duration-200 hover:text-white/80 lg:size-7"
      title={title}
    >
      <i className={`${icon} text-sm lg:text-base`} />
    </a>
  )
}

// 统一的圆形按钮样式（用于 PageHeaderRight）
export const ActionIconButton = ({
  icon,
  title,
  onClick,
  badge,
  href,
}: {
  icon: string
  title: string
  onClick?: () => void
  badge?: number
  href?: string
}) => {
  const commonClasses =
    'relative flex size-7 items-center justify-center rounded text-white/60 transition-all duration-200 hover:bg-white/10 hover:text-white lg:size-8'

  const content = (
    <>
      <i className={`${icon} text-sm lg:text-base`} />
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-blue-500 text-[9px] font-medium text-white lg:size-4">
          {badge}
        </span>
      )}
    </>
  )

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={commonClasses} title={title}>
        {content}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={commonClasses} title={title}>
      {content}
    </button>
  )
}
