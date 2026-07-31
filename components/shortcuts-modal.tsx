"use client"

import { Modal } from "@/components/ui/modal"
import { SHORTCUTS, SHORTCUT_GROUPS } from "@/lib/shortcuts"

type ShortcutsModalProps = {
  onClose: () => void
  /** Reflects the preference; the modal explains when shortcuts are off. */
  enabled: boolean
  onToggle: (enabled: boolean) => void
}

/**
 * Documents every shortcut by reading the same registry that binds them, so
 * the list cannot describe a key that does nothing.
 */
export function ShortcutsModal({ onClose, enabled, onToggle }: ShortcutsModalProps) {
  return (
    <Modal
      title="Atalhos de teclado"
      description="Atalhos funcionam fora de campos de texto, para não atrapalhar a digitação."
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted"
        >
          {enabled ? "Desativar atalhos" : "Ativar atalhos"}
        </button>
      }
    >
      {!enabled ? (
        <p className="mb-4 rounded-xl border border-warning/30 bg-warning-surface p-3 text-sm text-warning">
          Os atalhos estão desativados. A lista abaixo mostra o que fica disponível ao reativá-los.
        </p>
      ) : null}

      <div className="flex flex-col gap-6">
        {SHORTCUT_GROUPS.map((group) => {
          const items = SHORTCUTS.filter((shortcut) => shortcut.group === group)
          if (items.length === 0) return null
          return (
            <section key={group}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {group}
              </h3>
              <dl className="mt-2 divide-y divide-border">
                {items.map((shortcut) => (
                  <div key={shortcut.id} className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-sm text-foreground">{shortcut.description}</dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key, index) => (
                        <span key={key} className="flex items-center gap-1">
                          {index > 0 ? (
                            <span aria-hidden="true" className="text-xs text-muted-foreground">
                              +
                            </span>
                          ) : null}
                          <kbd className="min-w-[1.75rem] rounded-md border border-border bg-muted px-2 py-1 text-center font-mono text-xs font-bold text-foreground">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )
        })}
      </div>
    </Modal>
  )
}
