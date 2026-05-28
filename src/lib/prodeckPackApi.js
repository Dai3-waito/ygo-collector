import { packCatalog } from '../data/packCatalog.js'
import { resolveCanonicalPackName } from './packTotalsStorage.js'

function aliasPackSearchName(packName) {
  const canonical = resolveCanonicalPackName(packName)
  return canonical !== packName?.trim() ? canonical : null
}

const CARDSETS_API = '/api/ygo-cardsets'
const SETINFO_API = '/api/ygo-setinfo'
const SET_RARITIES_API = '/api/ygo-set-rarities'
const CACHE_KEY = 'ygo-prodeck-sets-v1'
const SETLIST_CACHE_KEY = 'ygo-prodeck-setlist-v1'
const SETINFO_CACHE_KEY = 'ygo-prodeck-setinfo-v1'
const CACHE_MS = 24 * 60 * 60 * 1000

function normalizeName(name) {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[＋+]/g, '+')
    .replace(/[：:·－—–・\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { at, entries } = JSON.parse(raw)
    if (!at || !entries || Date.now() - at > CACHE_MS) return null
    return new Map(entries)
  } catch {
    return null
  }
}

function writeCache(key, map) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ at: Date.now(), entries: [...map.entries()] }),
    )
  } catch {
    // ignore
  }
}

function readArrayCache(key) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { at, data } = JSON.parse(raw)
    if (!at || !data || Date.now() - at > CACHE_MS) return null
    return data
  } catch {
    return null
  }
}

function writeArrayCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    // ignore
  }
}

/** @returns {Promise<Map<string, number>>} */
export async function fetchProdeckSetIndex(signal) {
  const cached = readCache(CACHE_KEY)
  if (cached) return cached

  let res
  try {
    res = await fetch(CARDSETS_API, { signal })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    return new Map()
  }

  let list = []
  try {
    list = await res.json()
  } catch {
    list = []
  }

  if (!res.ok) return new Map()

  const index = new Map()
  for (const set of list) {
    const count = Number(set?.num_of_cards)
    const name = set?.set_name?.trim()
    const code = set?.set_code?.trim()?.toUpperCase()
    if (!Number.isFinite(count) || count < 1) continue

    if (name) {
      const key = `name:${normalizeName(name)}`
      const prev = index.get(key)
      if (prev == null || count > prev) index.set(key, Math.floor(count))
    }
    if (code) {
      const codeKey = `code:${code}`
      const prev = index.get(codeKey)
      if (prev == null || count > prev) index.set(codeKey, Math.floor(count))
    }
  }

  writeCache(CACHE_KEY, index)
  return index
}

export function lookupProdeckByName(packName, index) {
  if (!index?.size || !packName) return null

  const canonical = resolveCanonicalPackName(packName)
  const meta = packCatalog[canonical]
  const candidates = [meta?.deckSetName, canonical, packName, meta?.neuronKeyword].filter(
    Boolean,
  )

  for (const c of candidates) {
    const key = `name:${normalizeName(c)}`
    if (index.has(key)) return index.get(key)
  }

  const target = normalizeName(canonical)
  if (!target) return null

  for (const [key, count] of index.entries()) {
    if (!key.startsWith('name:')) continue
    const n = key.slice(5)
    if (n === target || n.includes(target) || target.includes(n)) return count
  }

  return null
}

export function lookupProdeckByCode(setCode, index) {
  if (!setCode || !index?.size) return null
  const code = String(setCode).toUpperCase()
  return index.get(`code:${code}`) ?? null
}

/** @returns {Promise<{ set_code: string, set_name: string, num_of_cards: number }[]>} */
export async function fetchProdeckSetList(signal) {
  const cached = readArrayCache(SETLIST_CACHE_KEY)
  if (cached) return cached

  let res
  try {
    res = await fetch(CARDSETS_API, { signal })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    return []
  }

  let list = []
  try {
    list = await res.json()
  } catch {
    list = []
  }

  if (!res.ok || !Array.isArray(list)) return []

  const rows = list
    .map((s) => ({
      set_code: String(s?.set_code ?? '').trim().toUpperCase(),
      set_name: String(s?.set_name ?? '').trim(),
      num_of_cards: Number(s?.num_of_cards) || 0,
    }))
    .filter((s) => s.set_code && s.set_name)

  writeArrayCache(SETLIST_CACHE_KEY, rows)
  return rows
}

function compactPackKey(name) {
  return normalizeName(name).replace(/\s/g, '')
}

/** パック名・型番から YGOPRODeck セットを特定 */
export function lookupProdeckSetMeta(packName, preferredPrefix, setList) {
  const prefix = String(preferredPrefix ?? '')
    .trim()
    .toUpperCase()
  if (prefix && setList?.length) {
    const row = setList
      .filter((s) => s.set_code === prefix)
      .sort((a, b) => b.num_of_cards - a.num_of_cards)[0]
    if (row) return { setCode: row.set_code, setName: row.set_name }
  }

  const canonical = resolveCanonicalPackName(packName)
  const alias = aliasPackSearchName(packName)
  const meta = packCatalog[canonical] ?? packCatalog[packName?.trim()]
  if (meta?.setCode) {
    const row = setList?.find((s) => s.set_code === meta.setCode.toUpperCase())
    return {
      setCode: meta.setCode.toUpperCase(),
      setName: row?.set_name ?? meta.deckSetName ?? meta.setCode,
    }
  }

  if (!setList?.length || !packName) return null

  const target = normalizeName(alias || canonical || packName)
  const compact = compactPackKey(alias || canonical || packName)

  let best = null
  let bestScore = 0

  for (const row of setList) {
    const nameNorm = normalizeName(row.set_name)
    const nameCompact = compactPackKey(row.set_name)
    let score = 0
    if (nameNorm === target || nameCompact === compact) score = 100
    else if (nameNorm.includes(target) || target.includes(nameNorm)) score = 85
    else if (nameCompact.includes(compact) || compact.includes(nameCompact)) score = 80

    if (score > bestScore) {
      bestScore = score
      best = row
    }
  }

  if (bestScore < 68 || !best) return null
  return { setCode: best.set_code, setName: best.set_name }
}

async function fetchSetInfoRows(setCode, signal) {
  const code = String(setCode ?? '').trim().toUpperCase()
  if (!code) return []

  const res = await fetch(`${SETINFO_API}?setcode=${encodeURIComponent(code)}`, { signal })
  let list = []
  try {
    list = await res.json()
  } catch {
    list = []
  }

  if (!res.ok || !Array.isArray(list)) return []
  return list
}

export function countRaritiesFromSetInfo(rows) {
  const counts = new Map()
  for (const row of rows) {
    const rarity = row?.set_rarity?.trim() || '（不明）'
    counts.set(rarity, (counts.get(rarity) ?? 0) + 1)
  }
  return counts
}

const SETINFO_RARITY_CACHE = 'ygo-prodeck-setinfo-rarity-v4'
const PRODECK_RARITY_TIMEOUT_MS = 8_000

function readRarityCache() {
  try {
    const raw = sessionStorage.getItem(SETINFO_RARITY_CACHE)
    if (!raw) return new Map()
    const { at, entries } = JSON.parse(raw)
    if (Date.now() - at > CACHE_MS) return new Map()
    return new Map(entries.map(([k, v]) => [k, new Map(v)]))
  } catch {
    return new Map()
  }
}

function writeRarityCache(map) {
  try {
    const entries = [...map.entries()].map(([code, rarityMap]) => [
      code,
      [...rarityMap.entries()],
    ])
    sessionStorage.setItem(
      SETINFO_RARITY_CACHE,
      JSON.stringify({ at: Date.now(), entries }),
    )
  } catch {
    // ignore
  }
}

export async function fetchRarityMapForSet(setCode, setName, signal) {
  const code = String(setCode ?? '').trim().toUpperCase()
  if (!code) return null

  const params = new URLSearchParams({ setcode: code })
  if (setName) params.set('setname', setName)

  const res = await fetch(`${SET_RARITIES_API}?${params}`, { signal })
  let body = {}
  try {
    body = await res.json()
  } catch {
    body = {}
  }

  if (!res.ok || !body.rarities) return null

  const counts = new Map()
  for (const [rarity, count] of Object.entries(body.rarities)) {
    const n = Number(count)
    if (Number.isFinite(n) && n > 0) counts.set(rarity, Math.floor(n))
  }
  return counts.size > 0 ? counts : null
}

/** YGOPRODeck は遅いことがあるためタイムアウト付き */
export async function fetchRarityMapForSetWithTimeout(
  setCode,
  setName,
  signal,
  timeoutMs = PRODECK_RARITY_TIMEOUT_MS,
) {
  if (signal?.aborted) return null

  const cache = readRarityCache()
  const code = String(setCode ?? '').trim().toUpperCase()
  if (code && cache.has(code)) {
    const cached = cache.get(code)
    if (cached?.size) return cached
  }

  let timeoutId
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs)
  })

  try {
    const result = await Promise.race([
      fetchRarityMapForSet(setCode, setName, signal),
      timeoutPromise,
    ])
    if (result?.size && code) {
      cache.set(code, result)
      writeRarityCache(cache)
    }
    return result
  } finally {
    clearTimeout(timeoutId)
  }
}

/** setCode → Map<rarity, count> */
export async function fetchRarityTotalsBySetCode(setMetas, signal) {
  const cache = readRarityCache()
  const missing = setMetas.filter((m) => m?.setCode && !cache.has(m.setCode))

  await Promise.all(
    missing.map(async ({ setCode, setName }) => {
      try {
        const counts = await fetchRarityMapForSet(setCode, setName, signal)
        if (counts) cache.set(setCode, counts)
      } catch (error) {
        if (error.name === 'AbortError') throw error
      }
    }),
  )

  writeRarityCache(cache)
  return cache
}

async function fetchSetInfoCount(setCode, signal) {
  const rows = await fetchSetInfoRows(setCode, signal)
  return rows.length > 0 ? rows.length : null
}

/** 型番接頭辞ごとの枚数（キャッシュ付き） */
export async function fetchProdeckSetInfoTotals(setCodes, signal) {
  const cache = readCache(SETINFO_CACHE_KEY) ?? new Map()
  const missing = [...new Set(setCodes)].filter((c) => c && !cache.has(c))

  await Promise.all(
    missing.map(async (code) => {
      try {
        const count = await fetchSetInfoCount(code, signal)
        if (count != null && count > 0) cache.set(code, count)
      } catch (error) {
        if (error.name === 'AbortError') throw error
      }
    }),
  )

  writeCache(SETINFO_CACHE_KEY, cache)
  return cache
}
