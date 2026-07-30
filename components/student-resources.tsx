import { ExternalLink } from "lucide-react"

// Official government entry points, not dates. Deadlines for ENEM/SISU/ProUni
// move every year and a hardcoded calendar here would quietly go stale and
// mislead exactly the reader who most needs it to be right — so we link to the
// authoritative page that always carries the current dates.
const OFFICIAL_LINKS = [
  {
    href: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem",
    name: "ENEM",
    org: "Inep",
    description: "Inscrições, cronograma oficial, provas e gabaritos anteriores.",
  },
  {
    href: "https://acessounico.mec.gov.br/sisu",
    name: "Sisu",
    org: "MEC",
    description: "Vagas em universidades públicas usando a nota do ENEM.",
  },
  {
    href: "https://acessounico.mec.gov.br/prouni",
    name: "ProUni",
    org: "MEC",
    description: "Bolsas de estudo integrais e parciais em faculdades privadas.",
  },
  {
    href: "https://acessounico.mec.gov.br/fies",
    name: "Fies",
    org: "MEC",
    description: "Financiamento estudantil com juros e prazos definidos por lei.",
  },
  {
    href: "https://www.gov.br/capes/pt-br",
    name: "Capes",
    org: "MEC",
    description: "Bolsas e programas de pós-graduação, mestrado e doutorado.",
  },
  {
    href: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/encceja",
    name: "Encceja",
    org: "Inep",
    description: "Certificação de conclusão do ensino fundamental e médio.",
  },
]

export function StudentResources() {
  return (
    <section aria-labelledby="oficiais-heading" className="rounded-2xl border bg-card p-5 md:p-6">
      <h2 id="oficiais-heading" className="font-serif text-xl font-bold md:text-2xl">
        Onde conferir a informação oficial
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Prazos e regras mudam todo ano. Estes são os canais do governo onde a data valendo é sempre a
        que está publicada — a Órbita não guarda cópia de calendário para não te passar informação vencida.
      </p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {OFFICIAL_LINKS.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col rounded-xl border bg-background p-4 transition-colors hover:border-primary hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                {link.name}
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {link.org}
                </span>
                <ExternalLink className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
              </span>
              <span className="mt-1 text-xs leading-relaxed text-muted-foreground">{link.description}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
