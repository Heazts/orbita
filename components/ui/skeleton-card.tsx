type SkeletonCardProps = {
  lead?: boolean
}

export function SkeletonCard({ lead }: SkeletonCardProps) {
  return (
    <div className={`motion-safe:animate-pulse ${lead ? "flex flex-col gap-4 rounded-xl bg-muted p-6 md:p-9" : "flex gap-4 border-b py-6"}`} aria-hidden="true">
      {!lead && <div className="size-20 shrink-0 rounded-lg bg-foreground/10 sm:size-24" />}
      <div className="flex flex-1 flex-col gap-3">
        <div className="h-3 w-40 rounded bg-foreground/10" />
        <div className={`rounded bg-foreground/10 ${lead ? "h-9 w-4/5" : "h-6 w-3/4"}`} />
        <div className="h-3 w-full rounded bg-foreground/10" />
        <div className="h-3 w-2/3 rounded bg-foreground/10" />
      </div>
    </div>
  )
}
