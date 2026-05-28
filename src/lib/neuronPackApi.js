import { packCatalog } from '../data/packCatalog.js'
import { neuronPackPageUrl } from './neuronParse.js'
import { resolveCanonicalPackName } from './packTotalsStorage.js'

const LIST_API = '/api/ygo-neuron-list'
const PACK_API = '/api/ygo-neuron-pack'
const PACK_RARITIES_API = '/api/ygo-neuron-pack-rarities'
const LIST_CACHE_KEY = 'ygo-neuron-pack-list-v4'
const TOTALS_CACHE_KEY = 'ygo-neuron-pack-totals-v4'
const RARITIES_CACHE_KEY = 'ygo-neuron-pack-rarities-v1'
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

function namesMatch(a, b) {
  const na = normalizePackName(a)
  const nb = normalizePackName(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true

  const aa = na.replace(/[^\x20-\x7e]/g, '').trim()
  const ab = nb.replace(/[^\x20-\x7e]/g, '').trim()
  if (aa.length >= 3 && ab.length >= 3) {
    if (aa === ab || aa.includes(ab) || ab.includes(aa)) return true
  }
  return false
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

export function setPrefixFromCardId(cardId) {
  const match = String(cardId ?? '').match(/^([A-Z0-9]{2,8})-JP/i)
  return match ? match[1].toUpperCase() : null
}

export function dominantSetPrefix(packCards) {
  const counts = new Map()
  for (const card of packCards) {
    const prefix = setPrefixFromCardId(card.id)
    if (!prefix) continue
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1)
  }
  let best = null
  let max = 0
  for (const [prefix, n] of counts) {
    if (n > max) {
      max = n
      best = prefix
    }
  }
  return best
}

/** 収録一覧のエントリ（pid + 公式 link_value の URL） */
export function resolveNeuronEntry(packName, packCards, packList) {
  const canonical = resolveCanonicalPackName(packName)
  const meta = packCatalog[canonical]

  if (meta?.neuronPid) {
    const fromList = packList?.find((p) => p.pid === meta.neuronPid)
    return {
      pid: meta.neuronPid,
      url: fromList?.url || neuronPackPageUrl(meta.neuronPid),
      name: fromList?.name,
    }
  }

  const setPrefix = dominantSetPrefix(packCards)
  const wantsBonus = /\+1|ボーナス/i.test(`${canonical} ${packName}`)
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
    if (!wantsBonus && /\+1|ボーナス/i.test(name)) continue

    const entryTokens = packSearchTokens(name)
    const upperName = name.toUpperCase()

    for (const kw of keywords) {
      for (const et of entryTokens) {
        let score = 0
        if (namesMatch(kw, et) || namesMatch(kw, name)) score = 100
        else if (normalizePackName(kw) && normalizePackName(et)) {
          const nk = normalizePackName(kw)
          const ne = normalizePackName(et)
          if (nk.includes(ne) || ne.includes(nk)) score = 88
        }
        if (setPrefix && upperName.includes(setPrefix)) score = Math.max(score, 82)

        if (score > bestScore) {
          bestScore = score
          best = entry
        }
      }
    }
  }

  if (bestScore < 55 || !best) return null
  return {
    pid: best.pid,
    url: best.url || neuronPackPageUrl(best.pid),
    name: best.name,
  }
}

export function resolveNeuronPid(packName, packCards, packList) {
  return resolveNeuronEntry(packName, packCards, packList)?.pid ?? null
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
          if (!res.ok || !body.rarities) return
          const counts = new Map()
          for (const [rarity, count] of Object.entries(body.rarities)) {
            const n = Number(count)
            if (Number.isFinite(n) && n > 0) counts.set(rarity, Math.floor(n))
          }
          if (counts.size > 0) {
            cache.set(pid, counts)
          }
        } catch (error) {
          if (error.name === 'AbortError') throw error
        }
      }),
    )
  }

  writeRaritiesCache(cache)
  return cache
}
