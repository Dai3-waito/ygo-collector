import { resolveOfficialTotal } from './packOfficialApi.js'
import { resolveCanonicalPackName } from './packTotalsStorage.js'

/**
 * パック別コンプ率（ニューロン収録 + YGOPRODeck + 型番の複合ソース）
 */
export function computePackCompletionList(cards, officialData) {
  const byPack = new Map()

  for (const card of cards) {
    const pack = resolveCanonicalPackName(card.pack)
    if (!pack) continue
    if (!byPack.has(pack)) byPack.set(pack, [])
    byPack.get(pack).push(card)
  }

  if (!officialData) {
    return [...byPack.entries()].map(([pack, packCards]) => ({
      pack,
      ownedKinds: packCards.filter((c) => (c.owned ?? 0) > 0).length,
      registeredKinds: packCards.length,
      officialTotal: null,
      rate: null,
      usesOfficialDenominator: false,
      totalSource: 'none',
      sourceLabel: null,
      neuronUrl: null,
      neuronPid: null,
    }))
  }

  return [...byPack.entries()]
    .map(([pack, packCards]) => {
      const ownedKinds = packCards.filter((c) => (c.owned ?? 0) > 0).length
      const registeredKinds = packCards.length
      const resolved = resolveOfficialTotal(pack, packCards, officialData)

      const useOfficial = resolved.total != null && resolved.total > 0
      const rate = useOfficial
        ? Math.min(100, Math.round((ownedKinds / resolved.total) * 100))
        : null

      return {
        pack,
        ownedKinds,
        registeredKinds,
        officialTotal: useOfficial ? resolved.total : null,
        rate,
        usesOfficialDenominator: useOfficial,
        totalSource: resolved.source,
        sourceLabel: resolved.sourceLabel,
        neuronUrl: resolved.neuronUrl,
        neuronPid: resolved.pid,
      }
    })
    .sort((a, b) => {
      const ar = a.rate ?? -1
      const br = b.rate ?? -1
      if (br !== ar) return br - ar
      return a.pack.localeCompare(b.pack, 'ja')
    })
}
