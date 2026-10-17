import type { ReactNode } from 'react'

export const autolink = (text: string): ReactNode[] => {
  if (!text) return []
  const urlPattern = /((?:https?:\/\/|www\.)[\x21-\x7E]+)/g
  return text.split(urlPattern).map((part, i) => {
    if (urlPattern.test(part)) {
      let href = part
      if (part.startsWith('www.')) {
        href = `http://${part}`
      }
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-blue-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    return part
  })
}
