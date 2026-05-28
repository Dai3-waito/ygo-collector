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
/** @param {string|number} imageId — パスワード（8桁）または百鸽 cid */
export function cardImageUrl(imageId, { lang = 'jp', size = 'half' } = {}) {
  const id = String(imageId ?? '').trim()
  if (!id) return ''
  const suffix =
    size === 'thumb' ? '!thumb2' : size === 'half' ? '!half' : ''

  if (lang === 'ygopro') {
    return `https://cdn.233.momobako.com/ygopro/pics/${id}.jpg${suffix}`
  }

  const webpLang = lang === 'jp' ? 'jp' : lang === 'sc' ? 'sc' : 'en'
  return `https://cdn.233.momobako.com/ygoimg/${webpLang}/${id}.webp${suffix}`
}

export function parseSetCodesFromTypes(typeLine) {
  const matches = String(typeLine ?? '').match(/\b[A-Z0-9]{2,8}-JP[A-Z0-9]{0,4}\b/gi)
  return [...new Set((matches ?? []).map((s) => s.toUpperCase()))]
}

export function cdbItemToCatalog(item, imageLang = 'jp', query = '') {
  const passcode = String(item.id)
  const typeLine = item.text?.types ?? ''
  const imageKey = item.cid ?? passcode
  const relevanceScore = scoreSearchItem(item, query)
  return {
    id: passcode,
    name: item.jp_name || item.sc_name || item.cn_name || item.en_name || passcode,
    nameEn: item.en_name ?? '',
    pack: typeLine.split('\n')[0]?.trim() || '',
    rarity: '',
    imageUrl: cardImageUrl(imageKey, { lang: imageLang, size: 'half' }),
    imageThumb: cardImageUrl(imageKey, { lang: imageLang, size: 'thumb' }),
    imageFallback: cardImageUrl(passcode, { lang: 'ygopro', size: 'half' }),
    passcode,
    cid: item.cid,
    setCodes: parseSetCodesFromTypes(typeLine),
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
    if (res.status === 400) {
      return { items: [], nextStart: 0 }
    }
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

/** 型番で百鸽を検索し、その印刷に対応する cid・画像を取得 */
export async function lookupCdbBySetCode(
  setCode,
  { signal, imageLang = 'jp' } = {},
) {
  const code = String(setCode ?? '').trim().toUpperCase()
  if (!code) return null

  const hits = await searchYgoCardsJa(code, { maxResults: 12, signal, imageLang })
  const exact = hits.find((h) => h.setCodes?.includes(code))
  return exact ?? hits[0] ?? null
}
