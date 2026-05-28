import { SEARCH_DISPLAY_LIMIT } from './constants.js'
function enToJpSetCode(setCode) {
  return String(setCode ?? '').replace(/-EN(\d+)$/i, '-JP$1')
}
import { normalizeForSearch } from './searchUtils.js'
import { cardImageUrl, cdbItemToCatalog, searchYgoCardsJa } from './ygoCdb.js'
import { fetchCardPrints } from './ygoPrints.js'
import { searchYgoCards } from './ygoProDeck.js'

const PRINTS_API = '/api/ygo-prints'

function isPasscode(query) {
  return /^\d{8}$/.test(String(query ?? '').trim())
}

function isSetCode(query) {
  return /^[A-Z0-9]{2,8}-(JP|EN)[A-Z0-9]{0,4}$/i.test(String(query ?? '').trim())
}

/** 同じ検索を複数の表記で試す */
export function buildSearchVariants(query) {
  const trimmed = String(query ?? '').trim()
  if (!trimmed) return []

  const variants = [trimmed]
  const noSpace = trimmed.replace(/\s+/g, '')
  if (noSpace && noSpace !== trimmed) variants.push(noSpace)

  const spaced = trimmed.replace(/[-－]/g, ' ')
  if (spaced !== trimmed) variants.push(spaced)

  const setPrefix = trimmed.match(/^([A-Za-z0-9]{2,8})[-－]?(JP|EN)?/i)
  if (setPrefix) {
    variants.push(setPrefix[1].toUpperCase())
    variants.push(`${setPrefix[1].toUpperCase()}-JP`)
  }

  return [...new Set(variants.filter((v) => v.length >= 2))]
}

function mergeCatalog(map, list) {
  for (const item of list) {
    const key = item.cid
      ? `${item.passcode}:${item.cid}`
      : item.passcode || item.id
    if (!key || map.has(key)) continue
    map.set(key, item)
  }
}

function prodeckHitsToCatalog(hits, imageLang = 'jp') {
  const byPasscode = new Map()
  for (const hit of hits) {
    const passcode = hit.passcode || hit.id?.replace(/^YGO-/, '')
    if (!passcode || byPasscode.has(passcode)) continue
    byPasscode.set(passcode, {
      id: passcode,
      name: hit.name,
      nameEn: hit.name,
      pack: hit.pack ?? '',
      rarity: hit.rarity ?? '',
      imageUrl:
        hit.imageUrl || cardImageUrl(passcode, { lang: imageLang, size: 'half' }),
      imageThumb: cardImageUrl(passcode, { lang: imageLang, size: 'thumb' }),
      imageFallback: cardImageUrl(passcode, { lang: 'ygopro', size: 'half' }),
      passcode,
      imageLang,
      nameMatch: true,
      source: 'ygoprodeck',
    })
  }
  return [...byPasscode.values()]
}

async function lookupByPasscode(passcode, signal, imageLang) {
  const res = await fetch(`${PRINTS_API}?id=${encodeURIComponent(passcode)}`, { signal })
  let body = {}
  try {
    body = await res.json()
  } catch {
    body = {}
  }
  if (!res.ok || !body.data?.[0]) return []

  const apiCard = body.data[0]
  return [
    {
      id: passcode,
      name: apiCard.name ?? passcode,
      nameEn: apiCard.name ?? '',
      pack: apiCard.card_sets?.[0]?.set_name ?? '',
      rarity: '',
      imageUrl: cardImageUrl(passcode, { lang: imageLang, size: 'half' }),
      imageThumb: cardImageUrl(passcode, { lang: imageLang, size: 'thumb' }),
      imageFallback: cardImageUrl(passcode, { lang: 'ygopro', size: 'half' }),
      passcode,
      imageLang,
      nameMatch: true,
      source: 'passcode',
    },
  ]
}

async function lookupBySetCode(setCode, signal, imageLang) {
  const code = setCode.trim().toUpperCase()
  const merged = new Map()

  for (const variant of [code, code.replace(/-EN/i, '-JP'), code.replace(/-JP/i, '-EN')]) {
    const hits = await searchYgoCardsJa(variant, { maxResults: 10, signal, imageLang })
    mergeCatalog(merged, hits)
    if (merged.size > 0) break
  }

  if (merged.size > 0) return [...merged.values()]

  const prefix = code.split('-')[0]
  const deckHits = await searchYgoCards(prefix, { maxResults: 100, signal })
  const matched = deckHits.filter((h) => {
    const id = String(h.id ?? '').toUpperCase()
    return (
      id === code ||
      id === enToJpSetCode(code) ||
      id === code.replace(/-JP/i, '-EN')
    )
  })
  if (matched.length > 0) {
    return prodeckHitsToCatalog(matched, imageLang)
  }

  return []
}

async function searchYgocdbVariants(variants, { maxResults, signal, imageLang }) {
  const merged = new Map()
  for (const variant of variants) {
    if (merged.size >= maxResults) break
    try {
      const hits = await searchYgoCardsJa(variant, {
        maxResults: maxResults - merged.size,
        signal,
        imageLang,
      })
      mergeCatalog(merged, hits)
    } catch {
      // 次の表記を試す
    }
  }
  return [...merged.values()]
}

async function searchProdeckVariants(variants, { maxResults, signal, imageLang }) {
  const merged = new Map()
  for (const variant of variants) {
    if (merged.size >= maxResults) break
    try {
      const hits = await searchYgoCards(variant, {
        maxResults: maxResults - merged.size,
        signal,
      })
      mergeCatalog(merged, prodeckHitsToCatalog(hits, imageLang))
    } catch {
      // 次の表記を試す
    }
  }
  return [...merged.values()]
}

/**
 * 百鸽 → YGOPRODeck → パスコード/型番 の順でフォールバック検索
 */
export async function searchCardsReliable(
  query,
  { maxResults = SEARCH_DISPLAY_LIMIT, signal, imageLang = 'jp' } = {},
) {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const merged = new Map()

  if (isPasscode(trimmed)) {
    try {
      mergeCatalog(merged, await lookupByPasscode(trimmed, signal, imageLang))
    } catch {
      // fall through
    }
    if (merged.size > 0) return [...merged.values()].slice(0, maxResults)
  }

  if (isSetCode(trimmed)) {
    try {
      mergeCatalog(merged, await lookupBySetCode(trimmed, signal, imageLang))
    } catch {
      // fall through
    }
    if (merged.size > 0) return [...merged.values()].slice(0, maxResults)
  }

  const variants = buildSearchVariants(trimmed)

  mergeCatalog(
    merged,
    await searchYgocdbVariants(variants, { maxResults, signal, imageLang }),
  )

  if (merged.size < maxResults) {
    mergeCatalog(
      merged,
      await searchProdeckVariants(variants, { maxResults, signal, imageLang }),
    )
  }

  if (merged.size === 0 && trimmed.length >= 2) {
    try {
      const loose = await searchYgoCardsJa(trimmed.slice(0, Math.max(2, trimmed.length - 1)), {
        maxResults,
        signal,
        imageLang,
      })
      mergeCatalog(merged, loose)
    } catch {
      // ignore
    }
  }

  const list = [...merged.values()]
  const normalizedQuery = normalizeForSearch(trimmed)
  list.sort((a, b) => {
    const aName = normalizeForSearch(a.name)
    const bName = normalizeForSearch(b.name)
    const aExact = aName === normalizedQuery ? 1 : 0
    const bExact = bName === normalizedQuery ? 1 : 0
    if (aExact !== bExact) return bExact - aExact
    const aStarts = aName.startsWith(normalizedQuery) ? 1 : 0
    const bStarts = bName.startsWith(normalizedQuery) ? 1 : 0
    if (aStarts !== bStarts) return bStarts - aStarts
    return (b.nameMatch ? 1 : 0) - (a.nameMatch ? 1 : 0)
  })

  return list.slice(0, maxResults)
}

/** パック候補用: レアリティ取得を並列（失敗はスキップ） */
export async function fetchPrintsReliable(passcode, signal) {
  try {
    const prints = await fetchCardPrints(passcode, signal)
    if (prints.length > 0) return prints
  } catch {
    // fall through
  }
  return []
}

export { cdbItemToCatalog }
