import { dominantSetPrefix } from './neuronPackApi.js'
import { canonicalRarityKey, mergeRarityCountMaps } from './rarityLabels.js'
import { resolveCanonicalPackName } from './packTotalsStorage.js'

const RARITY_ORDER = [
  'quarter_century',
  'prismatic_secret',
  'starlight',
  'ultimate',
  'secret',
  'ultra',
  'super',
  'holographic',
  'rare',
  'common',
]

function raritySortKey(canonicalKey) {
  const idx = RARITY_ORDER.indexOf(canonicalKey)
  return idx >= 0 ? idx : 99
}

function mapToCanonicalCounts(map) {
  const { counts, labels } = mergeRarityCountMaps(map)
  return { counts, labels }
}

/**
 * @param {Map<string, Map<string, number>>|null} officialRarityByPack pack → rarity → 公式枚数
 * @param {Map<string, string>|null} raritySourceByPack pack → 'prodeck' | 'neuron'
 */
export function computeRarityCompletionByPack(
  cards,
  officialRarityByPack = null,
  setMetaByPack = null,
  raritySourceByPack = null,
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
      const ownedByKey = new Map()
      const registeredByKey = new Map()
      const ownedLabels = new Map()
      const registeredLabels = new Map()

      for (const card of packCards) {
        const raw = card.rarity?.trim() || '（レアリティ未設定）'
        const key = canonicalRarityKey(raw)
        registeredByKey.set(key, (registeredByKey.get(key) ?? 0) + 1)
        if (!registeredLabels.has(key)) registeredLabels.set(key, raw)
        if ((card.owned ?? 0) > 0) {
          ownedByKey.set(key, (ownedByKey.get(key) ?? 0) + 1)
          if (!ownedLabels.has(key)) ownedLabels.set(key, raw)
        }
      }

      const officialMap = officialRarityByPack?.get(pack)
      const { counts: officialByKey, labels: officialLabels } = mapToCanonicalCounts(officialMap)

      const allKeys = new Set([
        ...officialByKey.keys(),
        ...ownedByKey.keys(),
        ...registeredByKey.keys(),
      ])

      const rarities = [...allKeys]
        .map((key) => {
          const owned = ownedByKey.get(key) ?? 0
          const registered = registeredByKey.get(key) ?? 0
          const official = officialByKey.get(key) ?? null
          const denominator = official != null && official > 0 ? official : registered
          const rate =
            denominator > 0 ? Math.min(100, Math.round((owned / denominator) * 100)) : 0

          const rarity =
            officialLabels.get(key) ??
            ownedLabels.get(key) ??
            registeredLabels.get(key) ??
            key

          return {
            rarity,
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
          dominantSetPrefix(packCards) ?? setMetaByPack?.get(pack)?.setCode ?? null,
        rarities,
        hasOfficialBreakdown: officialByKey.size > 0,
        source: raritySourceByPack?.get(pack) ?? null,
      }
    })
    .sort((a, b) => a.pack.localeCompare(b.pack, 'ja'))
}
