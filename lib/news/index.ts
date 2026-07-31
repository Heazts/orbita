/**
 * Public surface of the news domain.
 *
 * A barrel over lib/news/*. The modules behind it are cohesive and separately
 * testable; this keeps the 23 existing `@/lib/news` imports working rather than
 * rewriting every call site in the same change that moves the code.
 *
 * If this ever costs bundle size, pnpm check:bundle will say so — it measures
 * the home page's initial JS on every PR.
 */

export * from "./types"
export * from "./sources"
export * from "./text"
export * from "./curation"
