import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"

// Shared shell for the static legal pages (/privacidade, /termos): a back link,
// title, last-updated line, and a prose-styled content area. Descendant utility
// variants keep the page bodies as plain semantic HTML.
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center px-5 py-4 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para as notícias
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-12">
        <h1 className="text-balance font-serif text-3xl font-bold md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {updated}</p>
        <div className="mt-8 flex flex-col gap-6 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-muted-foreground [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </main>
    </div>
  )
}
