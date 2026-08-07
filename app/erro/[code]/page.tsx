import type { Metadata } from "next"
import { ErrorState, type ErrorCode } from "@/components/ui/error-state"

type ErrorPageProps = {
  params: Promise<{ code: string }>
}

const VALID_CODES = new Set<ErrorCode>([
  "400",
  "403",
  "404",
  "429",
  "500",
  "502",
  "503",
  "504",
  "OFFLINE",
  "MANUTENCAO",
])

// The path segment is arbitrary visitor-controlled text, so it is resolved
// against the allowlist before it is used anywhere. generateMetadata used to
// interpolate it raw, which let any URL put attacker-chosen words in the page
// title (and in the browser tab / shared-link preview) — "/erro/sua-conta-foi-
// suspensa" rendered a title saying exactly that, over the site's own name,
// while the page body showed the generic 500. Both now agree on one value.
function resolveErrorCode(code: string): ErrorCode {
  const uppercaseCode = code.toUpperCase() as ErrorCode
  return VALID_CODES.has(uppercaseCode) ? uppercaseCode : "500"
}

export async function generateMetadata({ params }: ErrorPageProps): Promise<Metadata> {
  const { code } = await params
  return {
    // No "· Órbita" here: the title template in app/layout.tsx appends the site
    // name to any string title a page returns, and spelling it out as well
    // rendered "Erro 500 · Órbita · Órbita" in the tab and in link previews.
    title: `Erro ${resolveErrorCode(code)}`,
    robots: { index: false, follow: false },
  }
}

export default async function SpecificErrorPage({ params }: ErrorPageProps) {
  const { code } = await params

  return <ErrorState code={resolveErrorCode(code)} />
}
