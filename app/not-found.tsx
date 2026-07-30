import type { Metadata } from "next"
import { ErrorState } from "@/components/ui/error-state"

export const metadata: Metadata = {
  title: "Página não encontrada (Erro 404)",
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return <ErrorState code="404" />
}
