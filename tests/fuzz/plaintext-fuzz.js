// Jazzer.js fuzz target for lib/news.ts — plainText / decodeEntities
// Feeds arbitrary strings to find edge cases in text cleaning.

const { FuzzedDataProvider } = require("@jazzer.js/core")
const { plainText, decodeEntities } = require("../../lib/news")

module.exports.fuzz = function (data) {
  const provider = new FuzzedDataProvider(data)
  const input = provider.consumeRemainingAsString()

  const decoded = decodeEntities(input)
  const cleaned = plainText(decoded)

  if (typeof cleaned !== "string") {
    throw new Error("plainText returned non-string")
  }
}
