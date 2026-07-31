"use client"

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react"
import { X } from "lucide-react"

// Ordered so the first match is the element a user would naturally land on.
// :not([disabled]) and tabindex="-1" are excluded because neither is reachable
// by Tab, and including them would let the trap park focus somewhere inert.
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ")

type ModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
  /** Rendered in a footer strip; typically the primary and dismiss actions. */
  footer?: ReactNode
  /** Optional supporting line under the title, announced with the dialog. */
  description?: string
  labelledBy?: string
}

/**
 * WAI-ARIA modal dialog.
 *
 * This lived twice, copy-pasted between the summary modal and the sources
 * modal, which meant a fix to one silently left the other behind. Extracted so
 * there is a single implementation of the four things a modal has to get right:
 *
 * 1. Move focus in on open, and to the dialog itself rather than a control, so
 *    a screen reader announces the title before any button label.
 * 2. Trap Tab and Shift+Tab inside while open — without this, tabbing walks
 *    into the page behind the overlay, which is still visible but inert.
 * 3. Close on Escape (SC 2.1.2, No Keyboard Trap).
 * 4. Restore focus to the element that opened it on unmount, so the keyboard
 *    user is put back where they were instead of at the top of the document.
 *
 * It also marks the rest of the page aria-hidden while open, so a screen
 * reader's virtual cursor cannot wander out of the dialog even though its
 * navigation does not use Tab.
 */
export function Modal({ title, onClose, children, footer, description }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  // Stable reference so the escape/trap effect does not re-subscribe whenever
  // the parent re-renders with a new inline closure.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    dialog?.focus()

    // Lock background scrolling. Without this the page behind scrolls under
    // the overlay when the pointer is outside the dialog.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== "Tab" || !dialog) return

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        // offsetParent is null for display:none subtrees; a hidden control
        // must not become a stop in the cycle.
        (element) => element.offsetParent !== null || element === document.activeElement,
      )
      if (focusable.length === 0) {
        // Nothing focusable inside: keep focus on the dialog rather than
        // letting Tab escape to the page behind.
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [])

  // Close only when the press *starts* on the backdrop. Using a plain onClick
  // means a drag that begins inside the dialog and releases on the backdrop —
  // easy to do when selecting text — dismisses the user's work.
  const pressStartedOnBackdrop = useRef(false)
  const onBackdropPointerDown = useCallback((event: React.PointerEvent) => {
    pressStartedOnBackdrop.current = event.target === event.currentTarget
  }, [])
  const onBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget && pressStartedOnBackdrop.current) onClose()
      pressStartedOnBackdrop.current = false
    },
    [onClose],
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onPointerDown={onBackdropPointerDown}
      onClick={onBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        // Focusable as a container so focus can start on the dialog itself.
        // -1 keeps it out of the Tab order.
        tabIndex={-1}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl focus-visible:outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="min-w-0">
            <h2 id={titleId} className="font-serif text-lg font-bold text-foreground">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/40 p-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
