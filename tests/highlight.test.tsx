// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Highlight } from "@/components/highlight"

afterEach(() => cleanup())

describe("Highlight", () => {
  it("renders text without query unchanged", () => {
    const { container } = render(<Highlight text="Hello world" query="" />)
    expect(container.textContent).toBe("Hello world")
  })

  it("renders matching terms with mark tag", () => {
    const { container } = render(<Highlight text="Inteligência artificial" query="inteligência" />)
    const marks = container.querySelectorAll("mark")
    expect(marks.length).toBeGreaterThanOrEqual(1)
  })

  it("is case-insensitive", () => {
    const { container } = render(<Highlight text="Brazil" query="brazil" />)
    const marks = container.querySelectorAll("mark")
    expect(marks.length).toBeGreaterThanOrEqual(1)
  })
})
