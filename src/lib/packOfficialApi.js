import { packTotals as fallbackPackTotals } from '../data/packTotals.js'
import { packCatalog } from '../data/packCatalog.js'
import {
  dominantSetPrefix,
  fetchNeuronPackList,
  fetchNeuronPackRarities,
  fetchNeuronPackTotals,
  neuronPackPageUrl,
  resolveNeuronEntry,
} from './neuronPackApi.js'
import {
  fetchProdeckSetIndex,
  fetchProdeckSetInfoTotals,
  fetchProdeckSetList,
  fetchRarityTotalsBySetCode,
  lookupProdeckByCode,
  lookupProdeckByName,
  lookupProdeckSetMeta,
} from './prodeckPackApi.js'
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

function packOfficialUrl(packName, entry, pid, officialData) {
  if (entry?.url) return entry.url

  const resolvedPid = pid ?? entry?.pid
  if (resolvedPid) {
    const fromList = officialData?.neuronList?.find((p) => p.pid === resolvedPid)
    if (fromList?.url) return fromList.url
    const fromTotals = officialData?.neuronTotals?.get(resolvedPid)
    if (fromTotals?.url) return fromTotals.url
    return neuronPackPageUrl(resolvedPid)
  }

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

  for (const pack of packKeys) {
    const packCards = cards.filter((c) => resolveCanonicalPackName(c.pack) === pack)
    const entry = resolveNeuronEntry(pack, packCards, neuronList)
    if (entry) entryByPack.set(pack, entry)
    const fromCards = dominantSetPrefix(packCards)
    const meta = lookupProdeckSetMeta(pack, fromCards, prodeckSetList)
    if (meta) setMetaByPack.set(pack, meta)
  }

  const prefixes = [...new Set([...setMetaByPack.values()].map((m) => m.setCode))]
  const setMetas = [...setMetaByPack.values()]

  const [neuronTotals, prodeckSetInfo, rarityBySetCode] = await Promise.all([
    fetchNeuronPackTotals(
      [...entryByPack.values()].map((e) => e.pid),
      neuronList,
      signal,
    ).catch((e) => {
      if (e.name !== 'AbortError') errors.push(e.message)
      return new Map()
    }),
    fetchProdeckSetInfoTotals([...prefixes], signal).catch(() => new Map()),
    fetchRarityTotalsBySetCode(setMetas, signal).catch(() => new Map()),
  ])

  const officialRarityByPack = new Map()
  const raritySourceByPack = new Map()

  for (const pack of packKeys) {
    const meta = setMetaByPack.get(pack)
    if (meta?.setCode && rarityBySetCode.has(meta.setCode)) {
      officialRarityByPack.set(pack, rarityBySetCode.get(meta.setCode))
      raritySourceByPack.set(pack, 'prodeck')
    }
  }

  const neuronPidsNeeded = packKeys
    .filter((pack) => !officialRarityByPack.has(pack))
    .map((pack) => entryByPack.get(pack)?.pid)
    .filter(Boolean)

  const neuronRarityByPid = await fetchNeuronPackRarities(
    neuronPidsNeeded,
    neuronList,
    signal,
  ).catch((e) => {
    if (e.name !== 'AbortError') errors.push(e.message)
    return new Map()
  })

  for (const pack of packKeys) {
    if (officialRarityByPack.has(pack)) continue
    const pid = entryByPack.get(pack)?.pid
    if (!pid || !neuronRarityByPid.has(pid)) continue
    officialRarityByPack.set(pack, neuronRarityByPid.get(pid))
    raritySourceByPack.set(pack, 'neuron')
  }

  return {
    neuronList,
    neuronTotals,
    prodeckIndex,
    prodeckSetInfo,
    entryByPack,
    setMetaByPack,
    officialRarityByPack,
    raritySourceByPack,
    errors,
  }
}

export function resolveOfficialTotal(packName, packCards, officialData) {
  const canonical = resolveCanonicalPackName(packName)
  const entry =
    officialData?.entryByPack?.get(canonical) ??
    resolveNeuronEntry(packName, packCards, officialData?.neuronList)
  const pid = entry?.pid ?? null
  const neuronUrl = packOfficialUrl(packName, entry, pid, officialData)
  const setPrefix = dominantSetPrefix(packCards)

  if (pid && officialData?.neuronTotals?.has(pid)) {
    const { total, url } = officialData.neuronTotals.get(pid)
    return {
      total,
      source: 'neuron',
      pid,
      neuronUrl: entry?.url || url || neuronUrl,
      sourceLabel: 'ニューロン（収録）',
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
