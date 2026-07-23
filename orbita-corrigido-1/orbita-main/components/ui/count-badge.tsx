type CountBadgeProps = {
  count: number
}

// Small numeric badge pinned to the corner of an IconButton (favorites count,
// unread new-articles count). Renders nothing at zero.
export function CountBadge({ count }: CountBadgeProps) {
  if (count <= 0) return null
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}
