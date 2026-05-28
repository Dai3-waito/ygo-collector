import {
  categorySearchTerms,
  createFilterMatcher,
  filterCatalogByMatcher,
  prodeckParamsFromIntent,
  resolveCategoryIntent,
} from './cardCategory.js'
import { SEARCH_DISPLAY_LIMIT, SEARCH_ENRICH_TOP } from './constants.js'
import {
  isOcgMarket,
  isTcgMarket,
  marketFromImageLang,
  normalizeSetCodeForMarket,
  preferredSetCodeSuffix,
} from './cardMarket.js'
import { matchesTextQuery, normalizeForSearch } from './searchUtils.js'
import {
  cardImageUrl,
  cdbItemToCatalog,
  enrichCatalogWithYgocdb,
  searchYgoCardsJa,
} from './ygoCdb.js'
import { themeProdeckArchetypes, themeYgocdbQueries } from '../data/cardThemes.js'
import { fetchCardPrints } from './ygoPrints.js'
import { getThemeByKey } from '../data/cardThemes.js'
import {
  searchYgoCards,
  searchYgoCardsByArchetype,
  searchYgoCardsByFilters,
} from './ygoProDeck.js'
import { hasActiveCategoryFilters } from './cardCategory.js'

const PRINTS_API = '/api/ygo-prints'

function isPasscode(query) {
  return /^\d{8}$/.test(String(query ?? '').trim())
}

function isSetCode(query) {
  return /^[A-Z0-9]{2,8}-(JP|EN)[A-Z0-9]{0,4}$/i.test(String(query ?? '').trim())
}

/** 同じ検索を複数の表記で試す（市場に合わせた型番優先） */
export function buildSearchVariants(query, market = null) {
  const trimmed = String(query ?? '').trim()
  if (!trimmed) return []

  const m = market ?? marketFromImageLang('jp')
  const suffix = preferredSetCodeSuffix(m)

  const variants = [trimmed]
  const noSpace = trimmed.replace(/\s+/g, '')
  if (noSpace && noSpace !== trimmed) variants.push(noSpace)

  const spaced = trimmed.replace(/[-－]/g, ' ')
  if (spaced !== trimmed) variants.push(spaced)

  const setPrefix = trimmed.match(/^([A-Za-z0-9]{2,8})[-－]?(JP|EN)?/i)
  if (setPrefix) {
    const code = setPrefix[1].toUpperCase()
    variants.push(code)
    variants.push(`${code}-${suffix}`)
    if (setPrefix[2]) {
      variants.push(normalizeSetCodeForMarket(trimmed.toUpperCase(), m))
    }
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

function prodeckHitsToCatalog(hits, imageLang = 'jp', market = null) {
  const m = market ?? marketFromImageLang(imageLang)
  const byPasscode = new Map()
  for (const hit of hits) {
    const passcode = hit.passcode || hit.id?.replace(/^YGO-/, '')
    if (!passcode || byPasscode.has(passcode)) continue
    const cardId = hit.id ?? ''
    if (isOcgMarket(m) && /-EN/i.test(cardId) && !/-JP/i.test(cardId)) continue
    if (isTcgMarket(m) && /-JP/i.test(cardId) && !/-EN/i.test(cardId)) continue

    byPasscode.set(passcode, {
      id: passcode,
      name: hit.name,
      nameEn: hit.name,
      pack: hit.pack ?? '',
      cardType: hit.cardType ?? '',
      cardRace: hit.cardRace ?? '',
      cardAttribute: hit.cardAttribute ?? '',
      typesLine: hit.typesLine ?? '',
      rarity: hit.rarity ?? '',
      imageUrl:
        hit.imageUrl || cardImageUrl(passcode, { lang: imageLang, size: 'half' }),
      imageThumb: cardImageUrl(passcode, { lang: imageLang, size: 'thumb' }),
      imageFallback: cardImageUrl(passcode, { lang: 'ygopro', size: 'half' }),
      passcode,
      imageLang,
      market: m,
      nameMatch: true,
      source: 'ygoprodeck',
    })
  }
  return [...byPasscode.values()]
}

async function lookupByPasscode(passcode, signal, imageLang, market) {
  const res = await fetch(`${PRINTS_API}?id=${encodeURIComponent(passcode)}`, { signal })
  let body = {}
  try {
    body = await res.json()
  } catch {
    body = {}
  }
  if (!res.ok || !body.data?.[0]) return []

  const apiCard = body.data[0]
  const prints = await fetchCardPrints(passcode, signal, market)
  const primary = prints[0]

  return [
    {
      id: primary?.setCode ?? passcode,
      name: apiCard.name ?? passcode,
      nameEn: apiCard.name ?? '',
      pack: primary?.setName ?? apiCard.card_sets?.[0]?.set_name ?? '',
      rarity: primary?.rarity ?? '',
      imageUrl: cardImageUrl(passcode, { lang: imageLang, size: 'half' }),
      imageThumb: cardImageUrl(passcode, { lang: imageLang, size: 'thumb' }),
      imageFallback: cardImageUrl(passcode, { lang: 'ygopro', size: 'half' }),
      passcode,
      imageLang,
      market,
      nameMatch: true,
      source: 'passcode',
    },
  ]
}

async function lookupBySetCode(setCode, signal, imageLang, market) {
  const m = market ?? marketFromImageLang(imageLang)
  const code = normalizeSetCodeForMarket(setCode.trim(), m)
  const merged = new Map()

  const ygocdbVariants = isOcgMarket(m)
    ? [code]
    : [code, code.replace(/-EN/i, '-JP')]
  for (const variant of ygocdbVariants) {
    const hits = await searchYgoCardsJa(variant, { maxResults: 10, signal, imageLang })
    mergeCatalog(merged, hits)
    if (merged.size > 0) break
  }

  if (merged.size > 0) return [...merged.values()]

  const prefix = code.split('-')[0]
  const deckHits = await searchYgoCards(prefix, { maxResults: 100, signal })
  const matched = deckHits.filter((h) => {
    const id = String(h.id ?? '').toUpperCase()
    return id === code || id === normalizeSetCodeForMarket(code, m)
  })
  if (matched.length > 0) {
    return prodeckHitsToCatalog(matched, imageLang, m)
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

function themeCatalogScore(card, theme) {
  const anchors = new Set((theme?.anchorPasscodes ?? []).map(String))
  if (anchors.has(String(card.passcode ?? ''))) return 1000

  const name = normalizeForSearch(card.name)
  const tokens = [
    theme?.label,
    theme?.searchQuery,
    ...(theme?.extraQueries ?? []),
  ]
    .map((t) => normalizeForSearch(t))
    .filter((t) => t.length >= 2)

  let score = card.nameMatch ? 80 : 0
  if (card.typesLine) score += 40
  if (card.setCodes?.length) score += 30
  if (card.cid) score += 10

  for (const token of tokens) {
    if (name === token) score += 200
    else if (name.startsWith(token)) score += 120
    else if (name.includes(token)) score += 60
  }

  if (/^[a-z0-9\s'.-]+$/.test(String(card.name ?? '').trim())) score -= 50

  return score
}

function sortThemeCatalog(list, theme) {
  list.sort((a, b) => themeCatalogScore(b, theme) - themeCatalogScore(a, theme))
  return list
}

async function fetchThemeAnchorCards(theme, { signal, imageLang }) {
  const anchors = (theme?.anchorPasscodes ?? []).slice(0, 6)
  if (!anchors.length) return []

  const hits = await Promise.all(
    anchors.map(async (passcode) => {
      try {
        const list = await searchYgoCardsJa(String(passcode), {
          maxResults: 2,
          signal,
          imageLang,
        })
        const pc = String(passcode)
        return list.find((h) => String(h.passcode) === pc) ?? list[0] ?? null
      } catch {
        return null
      }
    }),
  )
  return hits.filter(Boolean)
}

async function searchByTheme(theme, { maxResults, signal, imageLang, market }) {
  const merged = new Map()
  const fetchLimit = Math.min(maxResults + 20, SEARCH_DISPLAY_LIMIT + 20)

  mergeCatalog(merged, await fetchThemeAnchorCards(theme, { signal, imageLang }))

  const queries = themeYgocdbQueries(theme)
  const mainQuery = queries[0]
  if (mainQuery && merged.size < fetchLimit) {
    try {
      mergeCatalog(
        merged,
        await searchYgocdbVariants([mainQuery], {
          maxResults: fetchLimit - merged.size,
          signal,
          imageLang,
        }),
      )
    } catch {
      // ignore
    }
  }

  const archetypes = themeProdeckArchetypes(theme)
  if (archetypes[0] && merged.size < fetchLimit) {
    try {
      const hits = await searchYgoCardsByArchetype(archetypes[0], {
        maxResults: Math.min(80, fetchLimit - merged.size),
        signal,
      })
      mergeCatalog(merged, prodeckHitsToCatalog(hits, imageLang, market))
    } catch {
      // ignore
    }
  }

  const sparse = merged.size < Math.min(24, maxResults)
  if (sparse) {
    for (const query of queries.slice(1, 3)) {
      if (merged.size >= fetchLimit) break
      try {
        mergeCatalog(
          merged,
          await searchYgocdbVariants([query], {
            maxResults: 32,
            signal,
            imageLang,
          }),
        )
      } catch {
        // ignore
      }
    }
    for (const archetype of archetypes.slice(1, 2)) {
      if (merged.size >= fetchLimit) break
      try {
        const hits = await searchYgoCardsByArchetype(archetype, {
          maxResults: 40,
          signal,
        })
        mergeCatalog(merged, prodeckHitsToCatalog(hits, imageLang, market))
      } catch {
        // ignore
      }
    }
  }

  let list = sortThemeCatalog([...merged.values()], theme).slice(0, maxResults)
  if (isOcgMarket(market)) {
    list = await enrichCatalogWithYgocdb(list, {
      signal,
      imageLang,
      limit: SEARCH_ENRICH_TOP,
    })
  }
  return list
}

function sortByNameRelevance(list, query) {
  const normalizedQuery = normalizeForSearch(query)
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
  return list
}

function matchesThemeName(card, theme) {
  const blob = normalizeForSearch(`${card.name ?? ''} ${card.nameEn ?? ''}`)
  const q = normalizeForSearch(theme.searchQuery)
  const label = normalizeForSearch(theme.label)
  return (q.length >= 2 && blob.includes(q)) || (label.length >= 2 && blob.includes(label))
}

async function searchByNameQuery(trimmed, { maxResults, signal, imageLang, market }) {
  const merged = new Map()
  const variants = buildSearchVariants(trimmed, market)

  if (isOcgMarket(market)) {
    mergeCatalog(
      merged,
      await searchYgocdbVariants(variants, { maxResults, signal, imageLang }),
    )
    if (merged.size < maxResults) {
      mergeCatalog(
        merged,
        await searchProdeckVariants(variants, { maxResults, signal, imageLang, market }),
      )
    }
  } else {
    mergeCatalog(
      merged,
      await searchProdeckVariants(variants, { maxResults, signal, imageLang, market }),
    )
    if (merged.size < maxResults) {
      mergeCatalog(
        merged,
        await searchYgocdbVariants(variants, { maxResults, signal, imageLang }),
      )
    }
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

  return sortByNameRelevance([...merged.values()], trimmed).slice(0, maxResults)
}

async function narrowByTheme(list, theme, textQuery, ctx) {
  const { signal, imageLang, market } = ctx
  const byName = list.filter((c) => matchesThemeName(c, theme))
  if (byName.length > 0) return byName

  const themePool = await searchByTheme(theme, {
    maxResults: 64,
    signal,
    imageLang,
    market,
  })
  const passcodes = new Set(themePool.map((c) => String(c.passcode ?? '')))

  const inTheme = list.filter((c) => passcodes.has(String(c.passcode ?? '')))
  if (inTheme.length > 0) return inTheme

  return themePool.filter((c) => matchesTextQuery(c, textQuery))
}

async function searchAdvancedBrowse({ matcher, theme, maxResults, signal, imageLang, market }) {
  const cap = Math.min(maxResults + 30, SEARCH_DISPLAY_LIMIT + 30)
  let list = []

  if (theme) {
    list = await searchByTheme(theme, { maxResults: cap, signal, imageLang, market })
  } else if (matcher) {
    list = await searchByFilterMatcher(matcher, { maxResults: cap, signal, imageLang, market })
  }

  if (matcher && theme) {
    list = filterCatalogByMatcher(list, matcher)
  }

  return list.slice(0, maxResults)
}

async function searchAdvancedWithText(trimmed, { matcher, theme, maxResults, signal, imageLang, market }) {
  const nameCap = Math.min(maxResults + 40, SEARCH_DISPLAY_LIMIT + 40)
  const ctx = { signal, imageLang, market }

  let list = await searchByNameQuery(trimmed, { maxResults: nameCap, signal, imageLang, market })
  list = list.filter((c) => matchesTextQuery(c, trimmed))

  if (matcher) list = filterCatalogByMatcher(list, matcher)
  if (theme) list = await narrowByTheme(list, theme, trimmed, ctx)

  if (list.length === 0) {
    const pools = []
    if (theme) {
      pools.push(
        await searchByTheme(theme, { maxResults: maxResults, signal, imageLang, market }),
      )
    }
    if (matcher) {
      pools.push(
        await searchByFilterMatcher(matcher, {
          maxResults: maxResults,
          signal,
          imageLang,
          market,
        }),
      )
    }
    const merged = new Map()
    for (const pool of pools) mergeCatalog(merged, pool)
    list = [...merged.values()].filter((c) => matchesTextQuery(c, trimmed))
    if (matcher) list = filterCatalogByMatcher(list, matcher)
    if (theme && list.length === 0) {
      list = await narrowByTheme([], theme, trimmed, ctx)
    }
  }

  return sortByNameRelevance(list, trimmed).slice(0, maxResults)
}

async function applyFiltersToLookup(list, { matcher, theme, textQuery, maxResults, signal, imageLang, market }) {
  let out = list
  if (matcher) out = filterCatalogByMatcher(out, matcher)
  if (theme) {
    out = await narrowByTheme(out, theme, textQuery, { signal, imageLang, market })
  }
  return out.slice(0, maxResults)
}

async function searchByAdvancedFilters(categoryFilters, textQuery, options) {
  const { maxResults, signal, imageLang, market } = options
  const theme = categoryFilters?.theme ? getThemeByKey(categoryFilters.theme) : null
  const matcher = createFilterMatcher(categoryFilters)
  const trimmed = String(textQuery ?? '').trim()
  const hasText = trimmed.length >= 2
  const ctx = { matcher, theme, maxResults, signal, imageLang, market }

  if (hasText && isPasscode(trimmed)) {
    try {
      const hits = await lookupByPasscode(trimmed, signal, imageLang, market)
      return applyFiltersToLookup(hits, { ...ctx, textQuery: trimmed })
    } catch {
      return []
    }
  }

  if (hasText && isSetCode(trimmed)) {
    try {
      const hits = await lookupBySetCode(trimmed, signal, imageLang, market)
      return applyFiltersToLookup(hits, { ...ctx, textQuery: trimmed })
    } catch {
      return []
    }
  }

  if (hasText) {
    return searchAdvancedWithText(trimmed, ctx)
  }

  return searchAdvancedBrowse(ctx)
}

async function searchByFilterMatcher(matcher, { maxResults, signal, imageLang, market }) {
  const merged = new Map()
  const prodeck = matcher.prodeckParams()

  if (prodeck) {
    try {
      const hits = await searchYgoCardsByFilters(prodeck, { maxResults, signal })
      mergeCatalog(merged, prodeckHitsToCatalog(hits, imageLang, market))
    } catch {
      // ignore
    }
  }

  for (const term of matcher.searchTerms()) {
    if (merged.size >= maxResults) break
    try {
      const hits = await searchYgocdbVariants([term], {
        maxResults: maxResults - merged.size,
        signal,
        imageLang,
      })
      mergeCatalog(merged, hits)
    } catch {
      // ignore
    }
  }

  return filterCatalogByMatcher([...merged.values()], matcher).slice(0, maxResults)
}

async function searchByCategoryIntent(query, { maxResults, signal, imageLang, market }) {
  const intent = resolveCategoryIntent(query)
  if (!intent) return []

  const merged = new Map()

  for (const term of categorySearchTerms(query)) {
    if (merged.size >= maxResults) break
    try {
      const hits = await searchYgocdbVariants([term], {
        maxResults: maxResults - merged.size,
        signal,
        imageLang,
      })
      mergeCatalog(merged, hits)
    } catch {
      // ignore
    }
  }

  const prodeck = prodeckParamsFromIntent(intent)
  if (prodeck && merged.size < maxResults) {
    try {
      const hits = await searchYgoCardsByFilters(prodeck, {
        maxResults: maxResults - merged.size,
        signal,
      })
      mergeCatalog(merged, prodeckHitsToCatalog(hits, imageLang, market))
    } catch {
      // ignore
    }
  }

  return [...merged.values()]
}

async function searchProdeckVariants(variants, { maxResults, signal, imageLang, market }) {
  const merged = new Map()
  for (const variant of variants) {
    if (merged.size >= maxResults) break
    try {
      const hits = await searchYgoCards(variant, {
        maxResults: maxResults - merged.size,
        signal,
      })
      mergeCatalog(merged, prodeckHitsToCatalog(hits, imageLang, market))
    } catch {
      // 次の表記を試す
    }
  }
  return [...merged.values()]
}

/**
 * 百鸽（OCG） / YGOPRODeck（TCG）を検索言語に応じて優先
 */
export async function searchCardsReliable(
  query,
  { maxResults = SEARCH_DISPLAY_LIMIT, signal, imageLang = 'jp', categoryFilters = null } = {},
) {
  const trimmed = query.trim()
  const market = marketFromImageLang(imageLang)

  if (hasActiveCategoryFilters(categoryFilters)) {
    try {
      return await searchByAdvancedFilters(categoryFilters, trimmed, {
        maxResults,
        signal,
        imageLang,
        market,
      })
    } catch {
      return []
    }
  }

  if (trimmed.length < 2) return []

  const merged = new Map()

  if (isPasscode(trimmed)) {
    try {
      mergeCatalog(merged, await lookupByPasscode(trimmed, signal, imageLang, market))
    } catch {
      // fall through
    }
    if (merged.size > 0) return [...merged.values()].slice(0, maxResults)
  }

  if (isSetCode(trimmed)) {
    try {
      mergeCatalog(merged, await lookupBySetCode(trimmed, signal, imageLang, market))
    } catch {
      // fall through
    }
    if (merged.size > 0) return [...merged.values()].slice(0, maxResults)
  }

  const categoryIntent = resolveCategoryIntent(trimmed)
  if (categoryIntent) {
    try {
      mergeCatalog(
        merged,
        await searchByCategoryIntent(trimmed, { maxResults, signal, imageLang, market }),
      )
    } catch {
      // fall through to name search
    }
    if (merged.size > 0) {
      const list = [...merged.values()]
      list.sort((a, b) => (b.nameMatch ? 1 : 0) - (a.nameMatch ? 1 : 0))
      return list.slice(0, maxResults)
    }
  }

  return searchByNameQuery(trimmed, { maxResults, signal, imageLang, market })
}

/** レアリティ取得（市場でフィルタ） */
export async function fetchPrintsReliable(passcode, signal, market = null) {
  try {
    const prints = await fetchCardPrints(passcode, signal, market)
    if (prints.length > 0) return prints
  } catch {
    // fall through
  }
  return []
}

export { cdbItemToCatalog }
