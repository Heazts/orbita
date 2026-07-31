// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { SHORTCUTS, SHORTCUT_GROUPS, isBareKeyShortcut, isTypingTarget } from "@/lib/shortcuts"

// This file runs in the jsdom environment, where import.meta.url is an http
// URL rather than a file one, so paths are resolved from the project root.
const projectFile = (relative: string) => readFileSync(join(process.cwd(), relative), "utf8")

describe("shortcut registry", () => {
  it("has no duplicate ids", () => {
    const ids = SHORTCUTS.map((shortcut) => shortcut.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("has no duplicate key combinations", () => {
    const combos = SHORTCUTS.map((shortcut) => shortcut.keys.join("+"))
    expect(new Set(combos).size).toBe(combos.length)
  })

  it("assigns every shortcut to a declared group, so none is undocumented", () => {
    for (const shortcut of SHORTCUTS) {
      expect(SHORTCUT_GROUPS).toContain(shortcut.group)
    }
  })

  it("gives every shortcut a description for the help dialog", () => {
    for (const shortcut of SHORTCUTS) {
      expect(shortcut.description.trim().length).toBeGreaterThan(0)
      expect(shortcut.keys.length).toBeGreaterThan(0)
    }
  })

  // Ctrl and Cmd combinations belong to the browser and the OS. Binding one
  // would override things like Ctrl+1 (switch tab) that users rely on.
  it("never claims a Ctrl or Cmd combination", () => {
    for (const shortcut of SHORTCUTS) {
      expect(shortcut.keys).not.toContain("Ctrl")
      expect(shortcut.keys).not.toContain("Cmd")
      expect(shortcut.keys).not.toContain("Meta")
    }
  })

  // The bound handler and the help dialog read this same list, so a route
  // typo here would ship a documented shortcut that navigates nowhere.
  it("keeps the Alt route table in step with the registry", () => {
    const source = projectFile("hooks/use-shortcuts.ts")
    const altShortcuts = SHORTCUTS.filter((shortcut) => shortcut.keys[0] === "Alt")
    expect(altShortcuts.length).toBeGreaterThan(0)
    for (const shortcut of altShortcuts) {
      expect(shortcut.href).toBeDefined()
      // Each Alt+<digit> in the registry must appear as a key in ALT_ROUTES
      // mapped to the same href.
      expect(source).toContain(`"${shortcut.keys[1]}": "${shortcut.href}"`)
    }
  })
})

describe("isTypingTarget", () => {
  it("detects inputs, textareas and selects", () => {
    for (const tag of ["input", "textarea", "select"]) {
      expect(isTypingTarget(document.createElement(tag))).toBe(true)
    }
  })

  it("detects contenteditable regions, which a tagName check misses", () => {
    const editable = document.createElement("div")
    editable.contentEditable = "true"
    // jsdom does not derive isContentEditable from the attribute.
    Object.defineProperty(editable, "isContentEditable", { value: true })
    expect(isTypingTarget(editable)).toBe(true)
  })

  it("returns false for ordinary elements and for null", () => {
    expect(isTypingTarget(document.createElement("div"))).toBe(false)
    expect(isTypingTarget(document.createElement("button"))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})

describe("isBareKeyShortcut", () => {
  it("is true only for single-key shortcuts, which must yield while typing", () => {
    const search = SHORTCUTS.find((shortcut) => shortcut.id === "search")
    const home = SHORTCUTS.find((shortcut) => shortcut.id === "home")
    expect(search && isBareKeyShortcut(search)).toBe(true)
    expect(home && isBareKeyShortcut(home)).toBe(false)
  })
})
