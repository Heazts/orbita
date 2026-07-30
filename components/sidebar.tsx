import { ShieldCheck } from "lucide-react"
import Link from "next/link"

type SidebarProps = {
  onClear: () => void
}

export function Sidebar({ onClear }: SidebarProps) {
  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-40">
      <div className="rounded-2xl bg-primary p-6 text-primary-foreground lg:p-8">
        <p className="text-xs font-bold uppercase tracking-widest opacity-50">
          Explore melhor
        </p>
        <h2 className="mt-3 font-serif text-2xl font-bold leading-tight md:text-3xl">
          O mundo em perspectiva.
        </h2>
        <p className="mt-4 text-sm leading-relaxed opacity-60">
          Pesquise notícias indexadas pelo Google News, filtre por período e salve matérias
          importantes neste navegador.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onClear}
            className="w-full rounded-full border border-primary-foreground/20 px-4 py-2 text-xs font-bold transition-colors hover:bg-primary-foreground/10"
          >
            Limpar busca e filtros
          </button>
        </div>
        <div className="mt-6 border-t border-primary-foreground/10 pt-4">
          <p className="text-[11px] leading-relaxed opacity-40">
            Dados de feeds RSS públicos e Google News. Atualização automática a cada 30 segundos no modo ao vivo.
          </p>
        </div>
      </div>

      {/* Dedicated Privacy Policy Area */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Sua Privacidade em 1º Lugar</h3>
            <p className="text-xs text-muted-foreground">100% privado e seguro</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          O Órbita não exige cadastro, não coleta dados pessoais e não usa cookies de rastreamento. Seus favoritos e histórico ficam salvos apenas no seu próprio navegador.
        </p>
        <Link
          href="/privacidade"
          className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted"
        >
          Ler Política de Privacidade
        </Link>
      </div>
    </aside>
  )
}