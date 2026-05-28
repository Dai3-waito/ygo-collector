import { MAX_SEARCH_RESULTS, YGO_API_PAGE_SIZE } from './constants.js'

/** 開発: Vite proxy / 本番: Vercel api/ygo-prodeck-search.js */
const PRODECK_SEARCH_API = '/api/ygo-prodeck-search'

function isJpSetCode(setCode) {
  return /-JP\d*$|-JP[A-Z]?$/i.test(setCode ?? '')
}

function isNoResultsError(status, body) {
  if (status !== 400 || !body?.error) return false
  const msg = String(body.error)
  return msg.includes('No card matching') || msg.includes('No card found')
}

/** API 1件を印刷（セット）ごとの選択肢に展開 */
export function expandCardPrints(apiCard) {
  const sets = apiCard.card_sets ?? []
  const jpSets = sets.filter((s) => isJpSetCode(s.set_code))
  const targetSets = jpSets.length > 0 ? jpSets : sets

  if (targetSets.length === 0) {
    const imageUrl = apiCard.card_images?.[0]?.image_url ?? ''
    return [
      {
        id: `YGO-${apiCard.id}`,
        name: apiCard.name,
        pack: apiCard.type ?? '',
        rarity: '',
        imageUrl,
        passcode: String(apiCard.id),
      },
    ]
  }

  return targetSets.map((set) => ({
    id: set.set_code || `YGO-${apiCard.id}`,
    name: apiCard.name,
    pack: set.set_name ?? '',
    rarity: set.set_rarity ?? '',
    imageUrl: apiCard.card_images?.[0]?.image_url ?? '',
    passcode: String(apiCard.id),
  }))
}

async function fetchCardPage(params, signal) {
  let res
  try {
    res = await fetch(`${PRODECK_SEARCH_API}?${params}`, { signal })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error(
      'カードデータベースに接続できません。ネットワークを確認するか、しばらくして再試行してください。',
    )
  }

  let body = {}
  try {
    body = await res.json()
  } catch {
    body = {}
  }

  if (!res.ok) {
    if (isNoResultsError(res.status, body)) {
      return { data: [], noMore: true }
    }
    const detail = body.error ? String(body.error) : `HTTP ${res.status}`
    throw new Error(detail)
  }

  const batch = body.data ?? []
  const noMore =
    batch.length < YGO_API_PAGE_SIZE ||
    !body.meta?.next_page ||
    (body.meta?.rows_remaining ?? 0) <= 0

  return { data: batch, noMore }
}

/**
 * YGOPRODeck で fuzzy 検索（最大 maxResults 件までページング）
 */
/** テーマ（アーキタイプ）で検索 */
export async function searchYgoCardsByArchetype(
  archetype,
  { maxResults = MAX_SEARCH_RESULTS, signal } = {},
) {
  const name = String(archetype ?? '').trim()
  if (!name) return []

  const results = []
  let offset = 0

  while (results.length < maxResults) {
    const params = new URLSearchParams({
      archetype: name,
      num: String(YGO_API_PAGE_SIZE),
      offset: String(offset),
      misc: 'yes',
    })

    const { data: batch, noMore } = await fetchCardPage(params, signal)
    if (batch.length === 0) break

    for (const card of batch) {
      results.push({
        id: `YGO-${card.id}`,
        name: card.name,
        pack: card.type ?? '',
        rarity: '',
        imageUrl: card.card_images?.[0]?.image_url ?? '',
        passcode: String(card.id),
        cardType: card.type ?? '',
        cardRace: card.race ?? '',
        cardAttribute: card.attribute ?? '',
        archetype: card.archetype ?? name,
      })
      if (results.length >= maxResults) return results
    }

    if (noMore) break
    offset += YGO_API_PAGE_SIZE
  }

  return results
}

/** 種族・カード種別で検索（TCG / カテゴリ検索） */
export async function searchYgoCardsByFilters(
  filters,
  { maxResults = MAX_SEARCH_RESULTS, signal } = {},
) {
  const results = []
  let offset = 0

  while (results.length < maxResults) {
    const params = new URLSearchParams({
      num: String(YGO_API_PAGE_SIZE),
      offset: String(offset),
      misc: 'yes',
    })
    if (filters.type) params.set('type', filters.type)
    if (filters.race) params.set('race', filters.race)
    if (filters.attribute) params.set('attribute', filters.attribute)
    if (filters.level) params.set('level', String(filters.level))
    if (filters.fname) params.set('fname', String(filters.fname).trim())

    const { data: batch, noMore } = await fetchCardPage(params, signal)
    if (batch.length === 0) break

    for (const card of batch) {
      results.push({
        id: `YGO-${card.id}`,
        name: card.name,
        pack: card.type ?? '',
        rarity: '',
        imageUrl: card.card_images?.[0]?.image_url ?? '',
        passcode: String(card.id),
        cardType: card.type ?? '',
        cardRace: card.race ?? '',
        cardAttribute: card.attribute ?? '',
      })
      if (results.length >= maxResults) return results
    }

    if (noMore) break
    offset += YGO_API_PAGE_SIZE
  }

  return results
}

export async function searchYgoCards(query, { maxResults = MAX_SEARCH_RESULTS, signal } = {}) {
  const trimmed = query.trim()
  if (!trimmed) return []

  const results = []
  let offset = 0

  while (results.length < maxResults) {
    const params = new URLSearchParams({
      fname: trimmed,
      num: String(YGO_API_PAGE_SIZE),
      offset: String(offset),
      misc: 'yes',
    })

    const { data: batch, noMore } = await fetchCardPage(params, signal)
    if (batch.length === 0) break

    for (const card of batch) {
      for (const print of expandCardPrints(card)) {
        results.push(print)
        if (results.length >= maxResults) return results
      }
    }

    if (noMore) break
    offset += YGO_API_PAGE_SIZE
  }

  return results
}
