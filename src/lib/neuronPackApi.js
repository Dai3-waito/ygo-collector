import { packCatalog } from '../data/packCatalog.js'
import { dominantSetPrefix, setPrefixFromCardId } from './cardMarket.js'
import { lookupProdeckSetMeta } from './prodeckPackApi.js'
import { neuronPackPageUrl } from './neuronParse.js'
import { resolveCanonicalPackName } from './packTotalsStorage.js'

const LIST_API = '/api/ygo-neuron-list'
const PACK_API = '/api/ygo-neuron-pack'
const PACK_RARITIES_API = '/api/ygo-neuron-pack-rarities'
const LIST_CACHE_KEY = 'ygo-neuron-pack-list-v5'
const TOTALS_CACHE_KEY = 'ygo-neuron-pack-totals-v4'
const RARITIES_CACHE_KEY = 'ygo-neuron-pack-rarities-v4'
const CACHE_MS = 7 * 24 * 60 * 60 * 1000

export function normalizePackName(name) {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[＋+]/g, '+')
    .replace(/[：:·－—–]/g, ' ')
    .replace(/[・]/g, ' ')
    .replace(/[\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 照合用トークン（日本語・英語・括弧内） */
export function packSearchTokens(packName) {
  const raw = String(packName ?? '').trim()
  if (!raw) return []

  const tokens = new Set([raw, normalizePackName(raw)])
  const bracket = raw.match(/\[([^\]]+)\]/)
  if (bracket) {
    tokens.add(bracket[1].trim())
    tokens.add(normalizePackName(bracket[1]))
  }
  const ascii = raw.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim()
  if (ascii.length >= 3) {
    tokens.add(ascii)
    tokens.add(normalizePackName(ascii))
  }
  return [...tokens].filter((t) => t.length >= 2)
}

function compactPackKey(name) {
  return normalizePackName(name).replace(/\s/g, '')
}

function namesMatch(a, b) {
  const na = normalizePackName(a)
  const nb = normalizePackName(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (compactPackKey(a) === compactPackKey(b)) return true

  const aa = na.replace(/[^\x20-\x7e]/g, '').trim()
  const ab = nb.replace(/[^\x20-\x7e]/g, '').trim()
  if (aa.length >= 3 && ab.length >= 3) {
    if (aa === ab || aa.includes(ab) || ab.includes(aa)) return true
  }
  return false
}

function substringMatchScore(a, b) {
  const na = normalizePackName(a)
  const nb = normalizePackName(b)
  if (!na || !nb) return 0
  if (na === nb) return 100
  const ca = compactPackKey(a)
  const cb = compactPackKey(b)
  if (ca === cb) return 98

  const shorter = na.length <= nb.length ? na : nb
  const longer = na.length > nb.length ? na : nb
  if (shorter.length < 8 || !longer.includes(shorter)) return 0
  const ratio = shorter.length / longer.length
  return ratio >= 0.72 ? 88 : 0
}

/** 収録名の [英語セット名] を取り出す */
export function englishBracketFromNeuronName(neuronName) {
  const m = String(neuronName ?? '').match(/\[([^\]]+)\]/)
  return m?.[1]?.trim() ?? null
}

function isBonusPackNeuronName(name) {
  return /\+1|ボーナス/i.test(String(name ?? ''))
}

/** packCatalog のエントリ（表記ゆれ・日本語キーワード含む） */
function findCatalogMeta(packName) {
  const canonical = resolveCanonicalPackName(packName)
  if (packCatalog[canonical]) return packCatalog[canonical]

  const norm = normalizePackName(packName)
  const compact = compactPackKey(packName)

  for (const [label, meta] of Object.entries(packCatalog)) {
    if (normalizePackName(label) === norm || compactPackKey(label) === compact) return meta
    if (meta.neuronKeyword && namesMatch(packName, meta.neuronKeyword)) return meta
    if (meta.deckSetName && namesMatch(packName, meta.deckSetName)) return meta
  }
  return null
}

function requiredSideVariant(packName) {
  const m = String(packName ?? '').match(/side\s*[：:]\s*([a-z0-9]+)/i)
  return m?.[1]?.toLowerCase() ?? null
}

function neuronNameMatchesSide(name, sideVariant) {
  if (!sideVariant) return true
  return normalizePackName(name).includes(sideVariant)
}

function resolveSetCodeFromPack(packName, packCards) {
  const fromCards = dominantSetPrefix(packCards)
  if (fromCards) return fromCards
  const raw = String(packName ?? '').trim()
  if (/^[A-Z0-9]{2,8}$/i.test(raw)) return raw.toUpperCase()
  const bracket = raw.match(/\[([A-Z0-9]{2,8})\]/i)
  return bracket?.[1]?.toUpperCase() ?? null
}

function neuronEntryResult(entry) {
  if (!entry?.pid) return null
  return {
    pid: entry.pid,
    url: entry.url || neuronPackPageUrl(entry.pid),
    name: entry.name,
  }
}

/** 型番 → YGOPRODeck セット名 → 収録 [英語名] の一致（最優先の自動照合） */
function matchNeuronEntryBySetCode(packName, packCards, packList, prodeckSetList, wantsBonus) {
  if (!packList?.length) return null

  const setCode = resolveSetCodeFromPack(packName, packCards)
  if (!setCode) return null

  const meta = prodeckSetList?.length
    ? lookupProdeckSetMeta(packName, setCode, prodeckSetList)
    : null
  if (!meta?.setName) return null

  const targetNorm = normalizePackName(meta.setName)
  const targetCompact = compactPackKey(meta.setName)

  const sideVariant = requiredSideVariant(packName)

  for (const entry of packList) {
    if (isBonusPackNeuronName(entry.name) !== wantsBonus) continue
    if (!neuronNameMatchesSide(entry.name, sideVariant)) continue

    const bracket = englishBracketFromNeuronName(entry.name)
    if (!bracket) continue

    const bn = normalizePackName(bracket)
    const bc = compactPackKey(bracket)
    if (
      bn === targetNorm ||
      bc === targetCompact ||
      namesMatch(bracket, meta.setName) ||
      substringMatchScore(bracket, meta.setName) >= 88
    ) {
      return entry
    }
  }

  return null
}

/** パック表記と収録名の直接照合（誤マッチを抑えた fuzzy） */
function matchNeuronEntryByPackName(packName, packCards, packList, wantsBonus) {
  const canonical = resolveCanonicalPackName(packName)
  const meta = findCatalogMeta(packName)
  const sideVariant = requiredSideVariant(packName)

  const keywords = [
    ...packSearchTokens(canonical),
    ...packSearchTokens(packName),
    ...(meta?.neuronKeyword ? packSearchTokens(meta.neuronKeyword) : []),
    ...(meta?.deckSetName ? packSearchTokens(meta.deckSetName) : []),
  ]

  let best = null
  let bestScore = 0

  for (const entry of packList ?? []) {
    const name = entry.name
    if (isBonusPackNeuronName(name) !== wantsBonus) continue
    if (!neuronNameMatchesSide(name, sideVariant)) continue

    const entryTokens = packSearchTokens(name)
    const bracket = englishBracketFromNeuronName(name)

    for (const kw of keywords) {
      if (kw.length < 3) continue

      for (const et of entryTokens) {
        let score = 0
        if (namesMatch(kw, et) || namesMatch(kw, name)) score = 100
        else if (bracket && namesMatch(kw, bracket)) score = 96
        else {
          const partial = substringMatchScore(kw, et)
          if (partial > 0) score = partial
        }

        if (score > bestScore || (score === bestScore && score >= 96 && !best)) {
          bestScore = score
          best = entry
        } else if (score === bestScore && score >= 96 && best) {
          const preferCurrent =
            !isBonusPackNeuronName(name) && isBonusPackNeuronName(best.name)
          if (preferCurrent) best = entry
        }
      }
    }
  }

  if (bestScore < 70 || !best) return null
  return best
}

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { at, data } = JSON.parse(raw)
    if (!at || data == null || Date.now() - at > CACHE_MS) return null
    return data
  } catch {
    return null
  }
}

function writeCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    // ignore
  }
}

export { neuronPackPageUrl }

/** @returns {Promise<{ name: string, pid: string }[]>} */
export async function fetchNeuronPackList(signal) {
  const cached = readCache(LIST_CACHE_KEY)
  if (cached?.length) return cached

  let res
  try {
    res = await fetch(LIST_API, { signal })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('公式「収録」一覧の取得に失敗しました')
  }

  let body = {}
  try {
    body = await res.json()
  } catch {
    body = {}
  }

  if (!res.ok) {
    throw new Error(body.error || '公式「収録」一覧の取得に失敗しました')
  }

  const packs = body.packs ?? []
  if (packs.length > 0) writeCache(LIST_CACHE_KEY, packs)
  return packs
}

export { dominantSetPrefix, setPrefixFromCardId } from './cardMarket.js'

/** 収録一覧のエントリ（pid + 公式 link_value の URL） */
export function resolveNeuronEntry(packName, packCards, packList, prodeckSetList = null) {
  const canonical = resolveCanonicalPackName(packName)
  const meta = findCatalogMeta(packName)
  const wantsBonus = /\+1|ボーナス/i.test(`${canonical} ${packName}`)

  if (meta?.neuronPid) {
    const fromList = packList?.find((p) => p.pid === meta.neuronPid)
    return neuronEntryResult({
      pid: meta.neuronPid,
      url: fromList?.url,
      name: fromList?.name,
    })
  }

  if (!packList?.length) return null

  const bySetCode = matchNeuronEntryBySetCode(
    packName,
    packCards,
    packList,
    prodeckSetList,
    wantsBonus,
  )
  if (bySetCode) return neuronEntryResult(bySetCode)

  const byName = matchNeuronEntryByPackName(packName, packCards, packList, wantsBonus)
  if (byName) return neuronEntryResult(byName)

  return null
}

export function resolveNeuronPid(packName, packCards, packList, prodeckSetList = null) {
  return resolveNeuronEntry(packName, packCards, packList, prodeckSetList)?.pid ?? null
}

/**
 * @returns {Promise<Map<string, { total: number, url: string, name?: string }>>}
 */
export async function fetchNeuronPackTotals(pids, packList, signal) {
  const cached = readCache(TOTALS_CACHE_KEY)
  const map = new Map()
  if (cached && typeof cached === 'object') {
    for (const [pid, value] of Object.entries(cached)) {
      if (value?.total > 0) map.set(pid, value)
    }
  }

  const listByPid = new Map((packList ?? []).map((p) => [p.pid, p]))
  const missing = [...new Set(pids)].filter((pid) => pid && !map.has(pid))

  const BATCH = 6
  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH)
    await Promise.all(
      chunk.map(async (pid) => {
        try {
          const res = await fetch(`${PACK_API}?pid=${encodeURIComponent(pid)}`, { signal })
          let body = {}
          try {
            body = await res.json()
          } catch {
            body = {}
          }
          if (!res.ok || body.total == null || body.total < 1) return
          const listEntry = listByPid.get(pid)
          map.set(pid, {
            total: body.total,
            url: listEntry?.url || body.url || neuronPackPageUrl(pid),
            name: listEntry?.name,
          })
        } catch (error) {
          if (error.name === 'AbortError') throw error
        }
      }),
    )
  }

  writeCache(
    TOTALS_CACHE_KEY,
    Object.fromEntries([...map.entries()].map(([pid, v]) => [pid, v])),
  )
  return map
}

function readRaritiesCache() {
  try {
    const raw = sessionStorage.getItem(RARITIES_CACHE_KEY)
    if (!raw) return new Map()
    const { at, entries } = JSON.parse(raw)
    if (Date.now() - at > CACHE_MS) return new Map()
    return new Map(entries.map(([pid, list]) => [pid, new Map(list)]))
  } catch {
    return new Map()
  }
}

function writeRaritiesCache(map) {
  try {
    const entries = [...map.entries()].map(([pid, rarityMap]) => [pid, [...rarityMap.entries()]])
    sessionStorage.setItem(RARITIES_CACHE_KEY, JSON.stringify({ at: Date.now(), entries }))
  } catch {
    // ignore
  }
}

function parseNeuronRarityResponse(body) {
  if (!body?.rarities) return null
  const counts = new Map()
  for (const [rarity, count] of Object.entries(body.rarities)) {
    const n = Number(count)
    if (Number.isFinite(n) && n > 0) counts.set(rarity, Math.floor(n))
  }
  return counts.size > 0 ? counts : null
}

/** @returns {Promise<Map<string, number>|null>} */
export async function fetchNeuronPackRarityByPid(pid, signal) {
  const id = String(pid ?? '').trim()
  if (!id) return null

  const cache = readRaritiesCache()
  if (cache.has(id)) return cache.get(id)

  const res = await fetch(`${PACK_RARITIES_API}?pid=${encodeURIComponent(id)}`, { signal })
  let body = {}
  try {
    body = await res.json()
  } catch {
    body = {}
  }
  if (!res.ok) return null

  const counts = parseNeuronRarityResponse(body)
  if (counts) {
    cache.set(id, counts)
    writeRaritiesCache(cache)
  }
  return counts
}

/** @returns {Promise<Map<string, Map<string, number>>>} pid → rarity → 枚数 */
export async function fetchNeuronPackRarities(pids, packList, signal) {
  const cache = readRaritiesCache()
  const listByPid = new Map((packList ?? []).map((p) => [p.pid, p]))
  const missing = [...new Set(pids)].filter((pid) => pid && !cache.has(pid))

  const BATCH = 4
  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH)
    await Promise.all(
      chunk.map(async (pid) => {
        try {
          const res = await fetch(`${PACK_RARITIES_API}?pid=${encodeURIComponent(pid)}`, {
            signal,
          })
          let body = {}
          try {
            body = await res.json()
          } catch {
            body = {}
          }
          if (!res.ok) return
          const counts = parseNeuronRarityResponse(body)
          if (counts) cache.set(pid, counts)
        } catch (error) {
          if (error.name === 'AbortError') throw error
        }
      }),
    )
  }

  writeRaritiesCache(cache)
  return cache
}
