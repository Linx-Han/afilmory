import { clsxm as cn } from '@afilmory/utils'
import { useAtomValue } from 'jotai'
import { selectAtom } from 'jotai/utils'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { sessionUserAtom } from '~/atoms/session'
import type { Comment, CommentUser } from '~/lib/api/comments'
import { jotaiStore } from '~/lib/jotai'

import { CommentActionBar } from './CommentActionBar'
import { CommentContent } from './CommentContent'
import { CommentHeader } from './CommentHeader'
import { useCommentsContext } from './context'
import { UserAvatar } from './UserAvatar'

interface CommentItemProps {
  comment: Comment
  reacted: boolean
  isNew?: boolean

  locale: string

  user?: CommentUser | null
}

export const CommentItem = memo(({ comment, reacted, locale }: CommentItemProps) => {
  const { t } = useTranslation()
  const { atoms } = useCommentsContext()

  const userImage = useAtomValue(
    useMemo(
      () => selectAtom(atoms.usersAtom, (users) => users[comment.userId]?.image),
      [atoms.usersAtom, comment.userId],
    ),
  )
  const user = useAtomValue(
    useMemo(() => selectAtom(atoms.usersAtom, (users) => users[comment.userId]), [atoms.usersAtom, comment.userId]),
  )
  const userName = useAtomValue(
    useMemo(
      () => selectAtom(atoms.usersAtom, (users) => users[comment.userId]?.name),
      [atoms.usersAtom, comment.userId],
    ),
  )
  const authorName = useCallback(
    (comment: Comment) => {
      const sessionUser = jotaiStore.get(sessionUserAtom)
      if (sessionUser?.id && comment.userId === sessionUser.id) {
        return t('comments.you')
      }

      if (userName) {
        return userName
      }
      if (comment.userId) {
        return t('comments.user', { id: comment.userId.slice(-6) })
      }
      return t('comments.anonymous')
    },
    [t, userName],
  )
  return (
    <div
      className={cn(
        'relative py-2',
        // isNew && 'animate-highlight-new',
      )}
    >
      <div className="relative z-10 flex min-w-0 flex-row gap-3">
        <UserAvatar image={userImage} name={userName ?? comment.userId} fallback="?" size={36} />
        <div className="flex min-w-0 flex-1 flex-col space-y-2">
          <CommentHeader comment={comment} author={authorName(comment)} locale={locale} user={user} />
          <CommentContent comment={comment} parentId={comment.parentId} authorName={authorName} />
          <CommentActionBar reacted={reacted} reactionCount={comment.reactionCounts.like ?? 0} comment={comment} />
        </div>
      </div>
    </div>
  )
})
CommentItem.displayName = 'CommentCard'
