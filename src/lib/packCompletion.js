import { marketLabel, resolvePackMarket } from './cardMarket.js'
import { resolveOfficialTotal } from './packOfficialApi.js'
import { countUniqueCardKinds } from './packRarityUtils.js'
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
      ownedKinds: countUniqueCardKinds(packCards, { ownedOnly: true }),
      registeredKinds: countUniqueCardKinds(packCards, { ownedOnly: false }),
      officialTotal: null,
      rate: null,
      usesOfficialDenominator: false,
      totalSource: 'none',
      sourceLabel: null,
      neuronUrl: null,
      neuronPid: null,
      market: resolvePackMarket(pack, packCards),
      marketLabel: marketLabel(resolvePackMarket(pack, packCards)),
    }))
  }

  return [...byPack.entries()]
    .map(([pack, packCards]) => {
      const ownedKinds = countUniqueCardKinds(packCards, { ownedOnly: true })
      const registeredKinds = countUniqueCardKinds(packCards, { ownedOnly: false })
      const market =
        officialData.marketByPack?.get(pack) ?? resolvePackMarket(pack, packCards)
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
        market,
        marketLabel: marketLabel(market),
      }
    })
    .sort((a, b) => {
      const ar = a.rate ?? -1
      const br = b.rate ?? -1
      if (br !== ar) return br - ar
      return a.pack.localeCompare(b.pack, 'ja')
    })
}
