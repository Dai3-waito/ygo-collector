import {
  SEARCH_DISPLAY_LIMIT,
  SEARCH_FETCH_PAGES_MAX,
} from './constants.js'
import { isStrongNameMatch, rankSearchResults, scoreSearchItem } from './searchRank.js'

/** 開発: Vite proxy / 本番: Vercel api/ygo-search.js */
const SEARCH_API = '/api/ygo-search'

/**
 * @param {'jp'|'en'|'sc'|'ygopro'} lang
 * @param {'thumb'|'half'|'full'} size
 */
export function cardImageUrl(passcode, { lang = 'jp', size = 'half' } = {}) {
  const id = String(passcode)
  const suffix =
    size === 'thumb' ? '!thumb2' : size === 'half' ? '!half' : ''

  if (lang === 'ygopro') {
    return `https://cdn.233.momobako.com/ygopro/pics/${id}.jpg${suffix}`
  }

  const webpLang = lang === 'jp' ? 'jp' : lang === 'sc' ? 'sc' : 'en'
  return `https://cdn.233.momobako.com/ygoimg/${webpLang}/${id}.webp${suffix}`
}

export function cdbItemToCatalog(item, imageLang = 'jp', query = '') {
  const passcode = String(item.id)
  const typeLine = item.text?.types ?? ''
  const relevanceScore = scoreSearchItem(item, query)
  return {
    id: passcode,
    name: item.jp_name || item.sc_name || item.cn_name || item.en_name || passcode,
    nameEn: item.en_name ?? '',
    pack: typeLine.split('\n')[0]?.trim() || '',
    rarity: '',
    imageUrl: cardImageUrl(passcode, { lang: imageLang, size: 'half' }),
    imageThumb: cardImageUrl(passcode, { lang: imageLang, size: 'thumb' }),
    imageFallback: cardImageUrl(passcode, { lang: 'ygopro', size: 'half' }),
    passcode,
    cid: item.cid,
    imageLang,
    relevanceScore,
    nameMatch: isStrongNameMatch(item, query),
    apiWeight: item.weight ?? 0,
  }
}

async function fetchSearchPage(query, start, signal) {
  const params = new URLSearchParams({ search: query, start: String(start) })
  let res
  try {
    res = await fetch(`${SEARCH_API}?${params}`, { signal })
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
    throw new Error(body.error || `検索エラー (${res.status})`)
  }

  return {
    items: body.result ?? [],
    nextStart: body.next ?? 0,
  }
}

/**
 * 百鸽 ygocdb — 日本語検索（関連度順・重複除去）
 */
export async function searchYgoCardsJa(
  query,
  { maxResults = SEARCH_DISPLAY_LIMIT, signal, imageLang = 'jp' } = {},
) {
  const trimmed = query.trim()
  if (!trimmed) return []

  const rawItems = []
  let start = 0
  let pages = 0

  while (pages < SEARCH_FETCH_PAGES_MAX) {
    const { items, nextStart } = await fetchSearchPage(trimmed, start, signal)
    if (items.length === 0) break
    rawItems.push(...items)
    pages += 1
    if (!nextStart) break
    start = nextStart
  }

  const ranked = rankSearchResults(rawItems, trimmed)
  return ranked
    .slice(0, maxResults)
    .map((item) => cdbItemToCatalog(item, imageLang, trimmed))
}
