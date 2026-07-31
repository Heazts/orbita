/**
 * Fails the build when the home page's initial JavaScript grows past its budget.
 *
 * Measures the real thing: it starts the production server, fetches the page,
 * and sums the scripts the HTML actually declares — the bytes a browser must
 * download before hydration. Summing every file under .next/static would be
 * easier and wrong, because that total includes lazily-loaded chunks nobody
 * fetches on first paint.
 *
 * Two rules this script exists to enforce on itself, both learned the hard way
 * when a measurement was taken against a stale server and reported a 2x
 * regression that never happened:
 *
 *   1. Use a port nobody else is on, and pick it fresh each run.
 *   2. Prove the server answering is the one just started, by refusing to
 *      measure until a process spawned here reports ready.
 *
 * Run with: pnpm check:bundle
 */

import { spawn } from "node:child_process"
import { createServer } from "node:net"
import { setTimeout as delay } from "node:timers/promises"

// Budget for the home page's initial JS, in kilobytes.
//
// Raise this only with a reason in the commit message. Lowering it is always
// welcome — code splitting the interaction-only components (the summary and
// sources modals, the filters and preferences panels) was measured at roughly
// 9 KB, so there is known headroom to claim.
const BUDGET_KB = 780

const READY_TIMEOUT_MS = 90_000
const POLL_INTERVAL_MS = 250

/** Asks the OS for a free port, so parallel runs cannot collide. */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + READY_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`o servidor encerrou antes de responder (código ${child.exitCode})`)
    }
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2_000) })
      if (response.ok) return
    } catch {
      // Ainda subindo.
    }
    await delay(POLL_INTERVAL_MS)
  }
  throw new Error(`servidor não respondeu em ${READY_TIMEOUT_MS / 1000}s`)
}

async function measure(baseUrl) {
  const html = await (await fetch(baseUrl)).text()

  // Only same-origin Next chunks; a cross-origin script would not be ours to
  // budget for.
  const scripts = [...new Set([...html.matchAll(/src="(\/_next\/[^"]+\.js)"/g)].map((m) => m[1]))]
  if (scripts.length === 0) {
    throw new Error("nenhum script encontrado no HTML — a página renderizou como esperado?")
  }

  let total = 0
  const sizes = []
  for (const path of scripts) {
    const response = await fetch(`${baseUrl}${path}`)
    if (!response.ok) throw new Error(`${path} respondeu ${response.status}`)
    const bytes = (await response.arrayBuffer()).byteLength
    sizes.push({ path, bytes })
    total += bytes
  }

  return { total, sizes, htmlBytes: Buffer.byteLength(html) }
}

const port = await findFreePort()
const baseUrl = `http://127.0.0.1:${port}`

const child = spawn("node_modules/.bin/next", ["start", "--port", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, PORT: String(port) },
})

let failure = null
try {
  await waitForServer(baseUrl, child)
  const { total, sizes, htmlBytes } = await measure(baseUrl)

  const totalKb = total / 1024
  sizes.sort((a, b) => b.bytes - a.bytes)

  console.log(`porta ${port} · ${sizes.length} scripts no HTML inicial\n`)
  for (const { path, bytes } of sizes) {
    console.log(`  ${(bytes / 1024).toFixed(1).padStart(8)} KB  ${path}`)
  }
  console.log(`\n  HTML             ${(htmlBytes / 1024).toFixed(1)} KB`)
  console.log(`  JS inicial       ${totalKb.toFixed(1)} KB`)
  console.log(`  orçamento        ${BUDGET_KB} KB`)
  console.log(`  folga            ${(BUDGET_KB - totalKb).toFixed(1)} KB\n`)

  if (totalKb > BUDGET_KB) {
    failure = `JS inicial em ${totalKb.toFixed(1)} KB, acima do orçamento de ${BUDGET_KB} KB.`
  } else {
    console.log("Dentro do orçamento.")
  }
} catch (error) {
  failure = error instanceof Error ? error.message : String(error)
} finally {
  child.kill("SIGTERM")
  // Give it a moment to exit cleanly before forcing, so the port is released
  // for whatever runs next.
  await delay(500)
  if (child.exitCode === null) child.kill("SIGKILL")
}

if (failure) {
  console.error(`\n${failure}`)
  process.exit(1)
}
