import type { Metadata } from "next"
import { ErrorState, type ErrorCode } from "@/components/ui/error-state"

type ErrorPageProps = {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: ErrorPageProps): Promise<Metadata> {
  const { code } = await params
  return {
    title: `Erro ${code.toUpperCase()} · Órbita`,
    robots: { index: false, follow: false },
  }
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
])

export default async function SpecificErrorPage({ params }: ErrorPageProps) {
  const { code } = await params
  const uppercaseCode = code.toUpperCase() as ErrorCode

  const validCode = VALID_CODES.has(uppercaseCode) ? uppercaseCode : "500"

  return <ErrorState code={validCode} />
}
