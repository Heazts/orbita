// Jazzer.js fuzz target for lib/parse.ts — parseFeed
// Feeds arbitrary data into the XML parser to find crashes, hangs, or
// exceptions that aren't caught.

const { FuzzedDataProvider } = require("@jazzer.js/core")
const { parseFeed } = require("../../lib/parse")

const FEED_SOURCES = [
  { name: "FuzzSource", url: "https://example.com", category: "Mundo" },
]

module.exports.fuzz = function (data) {
  const provider = new FuzzedDataProvider(data)
  const xml = provider.consumeRemainingAsString()

  try {
    parseFeed(xml, FEED_SOURCES[0], false)
  } catch (e) {
    // XML parser throws on malformed input — that's expected. We only care
    // about unexpected errors (TypeError, RangeError, etc.) or hangs.
    if (e instanceof Error && (e.name === "TypeError" || e.name === "RangeError")) {
      throw e
    }
  }
}
