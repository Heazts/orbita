import type { Metadata } from "next"
import { GameShell } from "@/components/games/game-shell"
import { SudokuGame } from "@/components/games/sudoku-game"

export const metadata: Metadata = {
  title: "Sudoku",
  description: "Complete a grade 9×9 sem repetir números nas linhas, colunas e blocos.",
  alternates: { canonical: "/jogos/sudoku" },
}

export default function SudokuPage() {
  return (
    <GameShell title="Sudoku" subtitle="Complete a grade 9×9 sem repetir números.">
      <SudokuGame />
    </GameShell>
  )
}
