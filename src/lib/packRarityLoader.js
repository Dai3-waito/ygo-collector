import { dominantSetPrefix, fetchNeuronPackRarityByPid } from './neuronPackApi.js'
import { fetchRarityMapForSetWithTimeout, lookupProdeckSetMeta } from './prodeckPackApi.js'
import { resolveCanonicalPackName } from './packTotalsStorage.js'

/**
 * パックごとにレアリティ内訳を取得（YGOPRODeck → ニューロン、並列・タイムアウト付き）
 */
export async function loadOfficialRarityByPack(
  packKeys,
  cards,
  entryByPack,
  setMetaByPack,
  prodeckSetList,
  signal,
) {
  const officialRarityByPack = new Map()
  const raritySourceByPack = new Map()

  await Promise.all(
    packKeys.map(async (pack) => {
      if (signal?.aborted) return

      const packCards = cards.filter((c) => resolveCanonicalPackName(c.pack) === pack)
      const entry = entryByPack.get(pack)
      const pid = entry?.pid

      let meta =
        setMetaByPack.get(pack) ??
        lookupProdeckSetMeta(pack, dominantSetPrefix(packCards), prodeckSetList)

      const [prodeckCounts, neuronCounts] = await Promise.all([
        meta?.setCode
          ? fetchRarityMapForSetWithTimeout(meta.setCode, meta.setName, signal)
          : Promise.resolve(null),
        pid ? fetchNeuronPackRarityByPid(pid, signal).catch(() => null) : Promise.resolve(null),
      ])

      if (signal?.aborted) return

      if (prodeckCounts?.size) {
        officialRarityByPack.set(pack, prodeckCounts)
        raritySourceByPack.set(pack, 'prodeck')
      } else if (neuronCounts?.size) {
        officialRarityByPack.set(pack, neuronCounts)
        raritySourceByPack.set(pack, 'neuron')
      }
    }),
  )

  return { officialRarityByPack, raritySourceByPack }
}
