/**
 * Keyboard shortcut registry.
 *
 * Kept as plain data, separate from the hook that binds it and the modal that
 * documents it, so the help dialog can never drift out of sync with what is
 * actually wired up — both read this one list.
 */

export type ShortcutGroup = "Navegação" | "Busca" | "Interface"

export type Shortcut = {
  id: string
  /** Rendered as individual <kbd> elements, in order. */
  keys: string[]
  description: string
  group: ShortcutGroup
  /** Present when the shortcut navigates somewhere. */
  href?: string
}

/**
 * Alt is the modifier for navigation because it is the one combination the
 * major browsers leave to the page: Ctrl/Cmd+number switches browser tabs, and
 * bare digits would fire while someone is typing a year into the search box.
 *
 * The bare "/" and "?" keys follow the convention set by GitHub and Slack, and
 * are suppressed while focus is in a text field (see use-shortcuts.ts) so they
 * can still be typed normally.
 */
export const SHORTCUTS: Shortcut[] = [
  { id: "search", keys: ["/"], description: "Ir para a busca", group: "Busca" },
  { id: "close", keys: ["Esc"], description: "Fechar menu, modal ou diálogo", group: "Interface" },
  { id: "help", keys: ["?"], description: "Abrir esta lista de atalhos", group: "Interface" },
  { id: "home", keys: ["Alt", "1"], description: "Início", group: "Navegação", href: "/" },
  { id: "students", keys: ["Alt", "2"], description: "Estudantes", group: "Navegação", href: "/estudantes" },
  { id: "games", keys: ["Alt", "3"], description: "Jogos", group: "Navegação", href: "/jogos" },
]

export const SHORTCUT_GROUPS: ShortcutGroup[] = ["Navegação", "Busca", "Interface"]

/**
 * True when the event originated from somewhere the user is typing, in which
 * case a single-character shortcut must not steal the keystroke.
 *
 * Covers contenteditable regions too — a plain tagName check misses those, and
 * a "/" swallowed mid-sentence is a genuinely confusing bug to hit.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
}

/** Shortcuts that use no modifier, and so must yield while the user is typing. */
export function isBareKeyShortcut(shortcut: Shortcut): boolean {
  return shortcut.keys.length === 1
}
