import { isOcgMarket } from './cardMarket.js'
import { dominantSetPrefix, fetchNeuronPackRarityByPid } from './neuronPackApi.js'
import {
  fetchRarityMapForSetWithTimeout,
  lookupProdeckSetMeta,
} from './prodeckPackApi.js'
import { englishNameFromNeuronEntry } from './packRarityUtils.js'
import { resolveCanonicalPackName } from './packTotalsStorage.js'

function resolveSetMetaForPack(pack, packCards, entry, setMetaByPack, prodeckSetList) {
  const existing = setMetaByPack.get(pack)
  if (existing?.setCode) return existing

      const fromCards = dominantSetPrefix(packCards, market)
  let meta = lookupProdeckSetMeta(pack, fromCards, prodeckSetList)
  if (meta?.setCode) return meta

  const enFromEntry = englishNameFromNeuronEntry(entry?.name)
  if (enFromEntry) {
    meta = lookupProdeckSetMeta(enFromEntry, fromCards, prodeckSetList)
    if (meta?.setCode) return meta
  }

  return lookupProdeckSetMeta(resolveCanonicalPackName(pack), fromCards, prodeckSetList)
}

/**
 * 全パックのレアリティ内訳（ニューロン収録を優先、未取得時は YGOPRODeck）
 */
export async function loadOfficialRarityByPack(
  packKeys,
  cards,
  entryByPack,
  setMetaByPack,
  prodeckSetList,
  marketByPack = null,
  signal,
) {
  const officialRarityByPack = new Map()
  const raritySourceByPack = new Map()
  const resolvedMetaByPack = new Map()

  await Promise.all(
    packKeys.map(async (pack) => {
      if (signal?.aborted) return

      const packCards = cards.filter((c) => resolveCanonicalPackName(c.pack) === pack)
      const entry = entryByPack.get(pack)
      const pid = entry?.pid
      const market = marketByPack?.get(pack)

      if (isOcgMarket(market) && pid) {
        try {
          const neuronCounts = await fetchNeuronPackRarityByPid(pid, signal)
          if (neuronCounts?.size) {
            officialRarityByPack.set(pack, neuronCounts)
            raritySourceByPack.set(pack, 'neuron')
            return
          }
        } catch (error) {
          if (error.name === 'AbortError') throw error
        }
      }

      const meta = resolveSetMetaForPack(
        pack,
        packCards,
        entry,
        setMetaByPack,
        prodeckSetList,
      )

      if (!meta?.setCode) return

      resolvedMetaByPack.set(pack, meta)

      try {
        const counts = await fetchRarityMapForSetWithTimeout(
          meta.setCode,
          meta.setName,
          signal,
          15_000,
        )
        if (!counts?.size) return
        officialRarityByPack.set(pack, counts)
        raritySourceByPack.set(pack, 'prodeck')
      } catch (error) {
        if (error.name === 'AbortError') throw error
      }
    }),
  )

  return { officialRarityByPack, raritySourceByPack, resolvedMetaByPack }
}
