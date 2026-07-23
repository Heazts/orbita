type SidebarProps = {
  onClear: () => void
}

export function Sidebar({ onClear }: SidebarProps) {
  return (
    <aside className="h-fit rounded-2xl bg-primary p-6 text-primary-foreground lg:sticky lg:top-40 lg:p-8">
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
    </aside>
  )
}