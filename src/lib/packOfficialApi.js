import { packTotals as fallbackPackTotals } from '../data/packTotals.js'
import { packCatalog } from '../data/packCatalog.js'
import {
  isOcgMarket,
  marketLabel,
  resolvePackMarket,
} from './cardMarket.js'
import {
  dominantSetPrefix,
  fetchNeuronPackList,
  fetchNeuronPackTotals,
  neuronPackPageUrl,
  resolveNeuronEntry,
} from './neuronPackApi.js'
import {
  fetchProdeckSetIndex,
  fetchProdeckSetInfoTotals,
  fetchProdeckSetList,
  lookupProdeckByCode,
  lookupProdeckByName,
  lookupProdeckSetMeta,
} from './prodeckPackApi.js'
import { loadOfficialRarityByPack } from './packRarityLoader.js'
import { sumRarityCountMap } from './packRarityUtils.js'
import { resolveCanonicalPackName } from './packTotalsStorage.js'

/** 収録一覧ページ（キーワード検索ではない） */
export const NEURON_SHUROKU_LIST_URL =
  'https://www.db.yugioh-card.com/yugiohdb/card_list.action?wname=CardSearch&clm=1&request_locale=ja'

function fallbackTotal(packName) {
  const canonical = resolveCanonicalPackName(packName)
  const lower = canonical.toLowerCase()
  for (const [key, value] of Object.entries(fallbackPackTotals)) {
    if (key.toLowerCase() === lower) return value
  }
  for (const [label, meta] of Object.entries(packCatalog)) {
    if (meta.deckSetName?.toLowerCase() === lower && fallbackPackTotals[label] != null) {
      return fallbackPackTotals[label]
    }
  }
  return null
}

function packOfficialUrl(packName, packCards, entry, pid, officialData, market = null) {
  if (entry?.url) return entry.url

  const m =
    market ??
    officialData?.marketByPack?.get(resolveCanonicalPackName(packName)) ??
    resolvePackMarket(packName, packCards)

  let resolvedPid = pid ?? entry?.pid
  let resolvedUrl = entry?.url

  if (
    isOcgMarket(m) &&
    !resolvedPid &&
    packCards?.length &&
    officialData?.neuronList?.length
  ) {
    const retry = resolveNeuronEntry(
      packName,
      packCards,
      officialData.neuronList,
      officialData.prodeckSetList,
    )
    if (retry?.pid) {
      resolvedPid = retry.pid
      resolvedUrl = retry.url
    }
  }

  if (resolvedUrl) return resolvedUrl

  if (resolvedPid) {
    const fromList = officialData?.neuronList?.find((p) => p.pid === resolvedPid)
    if (fromList?.url) return fromList.url
    const fromTotals = officialData?.neuronTotals?.get(resolvedPid)
    if (fromTotals?.url) return fromTotals.url
    return neuronPackPageUrl(resolvedPid)
  }

  if (!isOcgMarket(m)) return null
  return NEURON_SHUROKU_LIST_URL
}

export async function loadOfficialPackData(cards, signal) {
  const errors = []
  const [neuronList, prodeckIndex, prodeckSetList] = await Promise.all([
    fetchNeuronPackList(signal).catch((e) => {
      if (e.name !== 'AbortError') errors.push(e.message)
      return []
    }),
    fetchProdeckSetIndex(signal).catch(() => new Map()),
    fetchProdeckSetList(signal).catch(() => []),
  ])

  const packKeys = [...new Set(cards.map((c) => resolveCanonicalPackName(c.pack)).filter(Boolean))]
  const entryByPack = new Map()
  const setMetaByPack = new Map()
  const marketByPack = new Map()

  for (const pack of packKeys) {
    const packCards = cards.filter((c) => resolveCanonicalPackName(c.pack) === pack)
    const market = resolvePackMarket(pack, packCards)
    marketByPack.set(pack, market)

    const fromCards = dominantSetPrefix(packCards, market)
    const meta = lookupProdeckSetMeta(pack, fromCards, prodeckSetList)
    if (meta) setMetaByPack.set(pack, meta)

    if (isOcgMarket(market)) {
      const entry = resolveNeuronEntry(pack, packCards, neuronList, prodeckSetList)
      if (entry) entryByPack.set(pack, entry)
    }
  }

  for (const pack of packKeys) {
    if (entryByPack.has(pack) || !isOcgMarket(marketByPack.get(pack))) continue
    const packCards = cards.filter((c) => resolveCanonicalPackName(c.pack) === pack)
    const entry = resolveNeuronEntry(pack, packCards, neuronList, prodeckSetList)
    if (entry) entryByPack.set(pack, entry)
  }

  const prefixes = [...new Set([...setMetaByPack.values()].map((m) => m.setCode))]

  const [neuronTotals, prodeckSetInfo, rarityResult] = await Promise.all([
    fetchNeuronPackTotals(
      [...entryByPack.values()].map((e) => e.pid),
      neuronList,
      signal,
    ).catch((e) => {
      if (e.name !== 'AbortError') errors.push(e.message)
      return new Map()
    }),
    fetchProdeckSetInfoTotals([...prefixes], signal).catch(() => new Map()),
    loadOfficialRarityByPack(
      packKeys,
      cards,
      entryByPack,
      setMetaByPack,
      prodeckSetList,
      marketByPack,
      signal,
    ).catch((e) => {
      if (e.name !== 'AbortError') errors.push(e.message)
      return { officialRarityByPack: new Map(), raritySourceByPack: new Map() }
    }),
  ])

  const { officialRarityByPack, raritySourceByPack, resolvedMetaByPack } = rarityResult

  for (const [pack, meta] of resolvedMetaByPack) {
    if (meta?.setCode) setMetaByPack.set(pack, meta)
  }

  return {
    neuronList,
    neuronTotals,
    prodeckIndex,
    prodeckSetInfo,
    prodeckSetList,
    entryByPack,
    setMetaByPack,
    marketByPack,
    officialRarityByPack,
    raritySourceByPack,
    errors,
  }
}

export function resolveOfficialTotal(packName, packCards, officialData) {
  const canonical = resolveCanonicalPackName(packName)
  const market =
    officialData?.marketByPack?.get(canonical) ?? resolvePackMarket(packName, packCards)

  const entry =
    officialData?.entryByPack?.get(canonical) ??
    (isOcgMarket(market)
      ? resolveNeuronEntry(
          packName,
          packCards,
          officialData?.neuronList,
          officialData?.prodeckSetList,
        )
      : null)
  const pid = entry?.pid ?? null
  const neuronUrl = packOfficialUrl(packName, packCards, entry, pid, officialData, market)
  const setPrefix = dominantSetPrefix(packCards, market)

  const raritySrc = officialData?.raritySourceByPack?.get(canonical)
  const fromNeuronRarity = raritySrc === 'neuron'

  if (
    isOcgMarket(market) &&
    fromNeuronRarity &&
    pid &&
    officialData?.neuronTotals?.has(pid)
  ) {
    const { total, url } = officialData.neuronTotals.get(pid)
    return {
      total,
      source: 'neuron',
      pid,
      neuronUrl: entry?.url || url || neuronUrl,
      sourceLabel: `ニューロン（収録・${marketLabel(market)}）`,
    }
  }

  const rarityMap = officialData?.officialRarityByPack?.get(canonical)
  const raritySum = sumRarityCountMap(rarityMap)
  if (raritySum > 0) {
    return {
      total: raritySum,
      source: 'prodeck-rarity',
      pid,
      neuronUrl,
      sourceLabel: `YGOPRODeck（レアリティ合計・${marketLabel(market)}）`,
    }
  }

  if (isOcgMarket(market) && pid && officialData?.neuronTotals?.has(pid)) {
    const { total, url } = officialData.neuronTotals.get(pid)
    return {
      total,
      source: 'neuron',
      pid,
      neuronUrl: entry?.url || url || neuronUrl,
      sourceLabel: `ニューロン（収録・${marketLabel(market)}）`,
    }
  }

  const fromProdeckName = lookupProdeckByName(packName, officialData?.prodeckIndex)
  if (fromProdeckName != null) {
    return {
      total: fromProdeckName,
      source: 'prodeck',
      pid,
      neuronUrl,
      sourceLabel: 'YGOPRODeck',
    }
  }

  if (setPrefix) {
    const fromCodeIndex = lookupProdeckByCode(setPrefix, officialData?.prodeckIndex)
    if (fromCodeIndex != null) {
      return {
        total: fromCodeIndex,
        source: 'prodeck-code',
        pid,
        neuronUrl,
        sourceLabel: 'YGOPRODeck',
      }
    }
    const fromSetInfo = officialData?.prodeckSetInfo?.get(setPrefix)
    if (fromSetInfo != null) {
      return {
        total: fromSetInfo,
        source: 'prodeck-setinfo',
        pid,
        neuronUrl,
        sourceLabel: 'YGOPRODeck',
      }
    }
  }

  const fb = fallbackTotal(packName)
  if (fb != null) {
    return {
      total: fb,
      source: 'fallback',
      pid,
      neuronUrl,
      sourceLabel: '参考値',
    }
  }

  return {
    total: null,
    source: 'none',
    pid,
    neuronUrl,
    sourceLabel: null,
  }
}
