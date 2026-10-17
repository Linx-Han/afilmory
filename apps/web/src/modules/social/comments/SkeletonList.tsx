export const SkeletonList = () => (
  <>
    {Array.from({ length: 3 }, (_, index) => (
      <div key={`skeleton-${index}`} className="relative py-2">
        <div className="relative z-10 flex gap-3">
          <div className="size-9 shrink-0 animate-pulse rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            {/* CommentHeader skeleton */}
            <div className="flex flex-wrap items-baseline gap-2">
              <div className="h-4 w-20 animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-16 animate-pulse rounded-full bg-white/10" />
            </div>
            {/* CommentContent skeleton */}
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
            </div>
            {/* CommentActionBar skeleton */}
            <div className="flex items-center gap-4">
              <div className="h-3 w-12 animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-16 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </>
)
