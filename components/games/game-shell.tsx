import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"

// Shared chrome for the game pages: a back link to the games hub, a title and a
// centered content column.
export function GameShell({
  title,
  subtitle,
  backHref = "/jogos",
  backLabel = "Jogos",
  children,
}: {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center px-5 py-4 md:px-8">
          <Link
            href={backHref}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {backLabel}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg px-5 py-6 md:py-8">
        <h1 className="text-balance font-serif text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </main>
    </div>
  )
}
