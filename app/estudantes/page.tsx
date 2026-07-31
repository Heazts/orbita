import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Gamepad2 } from "lucide-react"
import { aggregateNews, DEFAULT_NEWS_QUERY } from "@/lib/aggregate"
import { StudentResources } from "@/components/student-resources"
import { StudentNewsList } from "@/components/student-news-list"

export const metadata: Metadata = {
  title: "Estudantes",
  description:
    "Notícias de educação, ENEM, vestibular, bolsas e financiamento estudantil, reunidas de fontes públicas e sempre com o link da fonte original.",
  alternates: { canonical: "/estudantes" },
}

export const revalidate = 300

export default async function EstudantesPage() {
  const { items } = await aggregateNews({ ...DEFAULT_NEWS_QUERY, category: "Educação" })

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para as notícias
          </Link>
          <Link
            href="/jogos"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Gamepad2 className="size-4" aria-hidden="true" />
            Pausa
          </Link>
        </div>
      </header>

      <main id="conteudo-principal" className="mx-auto flex max-w-5xl flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Área do estudante</p>
          <h1 className="mt-2 text-balance font-serif text-3xl font-bold md:text-4xl">
            Educação, ENEM e vestibular
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
            Tudo o que sai sobre educação nas fontes que a Órbita acompanha, em um lugar só. Cada
            manchete leva ao veículo original — a Órbita reúne e organiza, não reescreve.
          </p>
        </div>

        <StudentResources />

        <section aria-labelledby="noticias-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-primary pb-3">
            <h2 id="noticias-heading" className="font-serif text-2xl font-bold">
              Últimas de educação
            </h2>
            <p className="text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? "matéria" : "matérias"}
            </p>
          </div>
          <StudentNewsList items={items} />
        </section>
      </main>
    </div>
  )
}
