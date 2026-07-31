// Runtime type guards for values that cross a trust boundary — parsed JSON from
// localStorage, feed payloads, anything whose declared TypeScript type is a
// claim rather than a fact. Dependency-free on purpose so pure modules can use
// them without pulling in React or browser storage.

/** A predicate that narrows an unknown value to T. */
export type Guard<T> = (value: unknown) => value is T

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string")
}

// A finite, non-negative integer — what every persisted counter in this app
// (streaks, played counts, day indices) is. Rejects NaN and Infinity, which
// JSON round-trips as null but which arithmetic silently propagates.
export function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}
