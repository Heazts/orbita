type SkeletonCardProps = {
  lead?: boolean
}

export function SkeletonCard({ lead }: SkeletonCardProps) {
  return (
    <div
      className={`${lead ? "flex flex-col gap-4 rounded-2xl bg-muted/60 p-6 md:p-9" : "flex gap-4 border-b py-5 last:border-0 md:py-6"}`}
      aria-hidden="true"
      role="presentation"
    >
      {!lead && <div className="size-20 shrink-0 animate-pulse rounded-xl bg-foreground/5 sm:size-24" />}
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-16 animate-pulse rounded-full bg-foreground/5" />
          <div className="h-3 w-20 animate-pulse rounded-full bg-foreground/5" />
          <div className="h-3 w-12 animate-pulse rounded-full bg-foreground/5" />
        </div>
        <div className={`animate-pulse rounded-lg bg-foreground/5 ${lead ? "h-8 w-4/5 md:h-10" : "h-5 w-3/4"}`} />
        {lead && (
          <>
            <div className="h-3 w-full animate-pulse rounded bg-foreground/5" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-foreground/5" />
          </>
        )}
        {!lead && (
          <>
            <div className="h-3 w-full animate-pulse rounded bg-foreground/5" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-foreground/5" />
          </>
        )}
      </div>
    </div>
  )
}