import { normalize, type NewsCategory, type NewsItem } from "@/lib/news"

export type NewsCluster = {
  id: string
  lead: NewsItem
  items: NewsItem[]
  sourcesCount: number
  category: NewsCategory
}

/**
 * Extracts key normalized word tokens (length > 3, excluding common stop words)
 * from headlines and descriptions to compute textual similarity between news items.
 */
function extractTokens(text: string): Set<string> {
  const STOP_WORDS = new Set([
    "sobre", "para", "como", "mais", "menos", "onde", "quando", "quem", "qual",
    "com", "sem", "por", "que", "dos", "das", "aos", "nas", "nos", "uma", "uns",
    "umas", "está", "estão", "após", "entre", "contra", "diz", "afirma", "segundo",
    "este", "esta", "nesta", "neste", "pelo", "pela", "pelos", "pelas", "será", "serão",
  ])
  const normalized = normalize(text)
  const words = normalized.split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  return new Set(words)
}

/**
 * Computes Jaccard Similarity index between two token sets.
 * Returns a score between 0.0 (no overlap) and 1.0 (identical tokens).
 */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersectionSize = 0
  for (const token of a) {
    if (b.has(token)) intersectionSize += 1
  }
  const unionSize = a.size + b.size - intersectionSize
  return unionSize > 0 ? intersectionSize / unionSize : 0
}

/**
 * Groups news items covering the same event across different news outlets.
 * Items with a title Jaccard similarity >= threshold (default 0.35) are clustered.
 */
export function clusterNews(items: NewsItem[], threshold = 0.35): NewsCluster[] {
  const clusters: Array<{
    cluster: NewsCluster
    tokenSet: Set<string>
  }> = []

  for (const item of items) {
    const itemTokens = extractTokens(item.title)
    let matchedCluster = null

    for (const entry of clusters) {
      const similarity = jaccardSimilarity(itemTokens, entry.tokenSet)
      if (similarity >= threshold) {
        matchedCluster = entry
        break
      }
    }

    if (matchedCluster) {
      // Add item to existing cluster
      matchedCluster.cluster.items.push(item)
      // Keep the item with an image or earlier pubDate as the lead if better
      if (!matchedCluster.cluster.lead.image && item.image) {
        matchedCluster.cluster.lead = item
      }
      matchedCluster.cluster.sourcesCount = new Set(
        matchedCluster.cluster.items.map((i) => i.source),
      ).size
    } else {
      // Create new cluster
      clusters.push({
        cluster: {
          id: item.id,
          lead: item,
          items: [item],
          sourcesCount: 1,
          category: item.category,
        },
        tokenSet: itemTokens,
      })
    }
  }

  return clusters.map((c) => c.cluster)
}

/**
 * Collapses items covering the same story into a single entry (the cluster's
 * lead), attaching `sourcesCount`/`relatedSources` when more than one *outlet*
 * covered it. Unlike the API's exact-URL dedup, this catches the same event
 * reported by different sources with different URLs and headlines.
 *
 * Gated on `sourcesCount > 1`, not `items.length > 1`: the same outlet can
 * republish a near-duplicate (an update, a syndication) that clusters
 * together while still being a single source — that case is deduped away
 * silently rather than surfaced as a nonsensical "1 fontes" badge.
 */
export function toClusteredItems(items: NewsItem[], threshold = 0.35): NewsItem[] {
  return clusterNews(items, threshold).map((cluster) => {
    if (cluster.sourcesCount <= 1) return cluster.lead
    const relatedSources = Array.from(new Set(cluster.items.map((item) => item.source))).filter(
      (sourceName) => sourceName !== cluster.lead.source,
    )
    return { ...cluster.lead, sourcesCount: cluster.sourcesCount, relatedSources }
  })
}
