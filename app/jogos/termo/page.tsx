import type { Metadata } from "next"
import { GameShell } from "@/components/games/game-shell"
import { TermoGame } from "@/components/games/termo-game"

export const metadata: Metadata = {
  title: "Termo",
  description: "Descubra a palavra de 5 letras em 6 tentativas. Um jogo de palavras em português.",
  alternates: { canonical: "/jogos/termo" },
}

export default function TermoPage() {
  return (
    <GameShell title="Termo" subtitle="Descubra a palavra de 5 letras em 6 tentativas.">
      <TermoGame />
    </GameShell>
  )
}
