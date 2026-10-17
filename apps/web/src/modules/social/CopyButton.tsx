import { clsxm } from '@afilmory/utils'
import { useCallback, useState } from 'react'

interface CopyButtonProps {
  onCopy: () => Promise<void>
  className?: string
}

export const CopyButton = ({ onCopy, className }: CopyButtonProps) => {
  const [isCopying, setIsCopying] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const handleClick = useCallback(async () => {
    try {
      setIsCopying(true)
      await onCopy()
      setIsCopied(true)
      // Reset to copy icon after 1 second
      setTimeout(() => {
        setIsCopied(false)
      }, 1000)
    } catch {
      // Error handling is done in the parent component
    } finally {
      setIsCopying(false)
    }
  }, [onCopy])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={clsxm(
        'shrink-0 rounded-lg border border-white/10 p-1.5 text-white/80 transition-all duration-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      disabled={isCopying || isCopied}
    >
      <div className="relative size-4">
        <i
          className={clsxm(
            'i-mingcute-copy-2-line absolute inset-0 text-sm transition-all duration-300',
            isCopied ? 'scale-0 opacity-0' : 'scale-100 opacity-100',
          )}
        />
        <i
          className={clsxm(
            'i-mingcute-check-line absolute inset-0 text-sm transition-all duration-300',
            isCopied ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
          )}
        />
      </div>
    </button>
  )
}
