// localStorage is unavailable during SSR and can throw in private browsing
// or when the quota is exceeded — every call here is best-effort.
export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStore(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value))
  } catch {
    // Private mode or quota exceeded — persistence is best-effort.
  }
}
