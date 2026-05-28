import { dominantSetPrefix } from './cardMarket.js'
import { resolveOfficialTotal } from './packOfficialApi.js'
import {
  canonicalRarityKey,
  displayRarityLabel,
  mergeRarityCountMaps,
  rarityFullName,
  raritySortKey,
} from './rarityLabels.js'
import {
  countUniqueCardKinds,
  countUniqueKindsByRarity,
} from './packRarityUtils.js'
import { resolveCanonicalPackName } from './packTotalsStorage.js'

function mapToCanonicalCounts(map) {
  const { counts, labels } = mergeRarityCountMaps(map)
  return { counts, labels }
}

/**
 * @param {Map<string, Map<string, number>>|null} officialRarityByPack pack → rarity → 公式枚数
 * @param {Map<string, string>|null} raritySourceByPack pack → 'neuron' | 'prodeck'
 */
export function computeRarityCompletionByPack(
  cards,
  officialRarityByPack = null,
  setMetaByPack = null,
  raritySourceByPack = null,
  officialData = null,
) {
  const byPack = new Map()

  for (const card of cards) {
    const pack = resolveCanonicalPackName(card.pack)
    if (!pack) continue
    if (!byPack.has(pack)) byPack.set(pack, [])
    byPack.get(pack).push(card)
  }

  return [...byPack.entries()]
    .map(([pack, packCards]) => {
      const ownedByKey = countUniqueKindsByRarity(packCards, { ownedOnly: true })
      const registeredByKey = countUniqueKindsByRarity(packCards, { ownedOnly: false })

      const officialMap = officialRarityByPack?.get(pack)
      const { counts: officialByKey, labels: officialLabels } = mapToCanonicalCounts(officialMap)
      const hasOfficialBreakdown = officialByKey.size > 0

      const packOwnedKinds = countUniqueCardKinds(packCards, { ownedOnly: true })
      const packMarket = officialData?.marketByPack?.get(pack) ?? null
      const packResolved = officialData
        ? resolveOfficialTotal(pack, packCards, officialData)
        : null
      const packOfficialTotal =
        packResolved?.total != null && packResolved.total > 0 ? packResolved.total : null
      const packRate =
        packOfficialTotal != null && packOfficialTotal > 0
          ? Math.min(100, Math.round((packOwnedKinds / packOfficialTotal) * 100))
          : null

      const allKeys = hasOfficialBreakdown
        ? [...officialByKey.keys()]
        : [
            ...new Set([
              ...officialByKey.keys(),
              ...ownedByKey.keys(),
              ...registeredByKey.keys(),
            ]),
          ]

      const rarities = [...allKeys]
        .map((key) => {
          const owned = ownedByKey.get(key) ?? 0
          const registered = registeredByKey.get(key) ?? 0
          const official = officialByKey.get(key) ?? null
          const denominator = official != null && official > 0 ? official : registered
          const rate =
            denominator > 0 ? Math.min(100, Math.round((owned / denominator) * 100)) : 0

          const rarity = displayRarityLabel(key)
          const rarityName = rarityFullName(key)

          return {
            rarity,
            rarityName,
            owned,
            registered,
            official,
            denominator,
            rate,
            usesOfficial: official != null && official > 0,
            sortKey: raritySortKey(key),
          }
        })
        .sort(
          (a, b) =>
            a.sortKey - b.sortKey || b.rate - a.rate || a.rarity.localeCompare(b.rarity, 'ja'),
        )
        .map(({ sortKey: _sortKey, ...rest }) => rest)

      return {
        pack,
        setPrefix:
          dominantSetPrefix(packCards, packMarket) ??
          setMetaByPack?.get(pack)?.setCode ??
          null,
        market: packMarket,
        rarities,
        hasOfficialBreakdown,
        source: raritySourceByPack?.get(pack) ?? null,
        packOwnedKinds,
        packOfficialTotal,
        packRate,
      }
    })
    .sort((a, b) => a.pack.localeCompare(b.pack, 'ja'))
}
