"use client"

type IconButtonProps = {
  label: string
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}

export function IconButton({ label, onClick, active, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active ?? undefined}
      className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  )
}
