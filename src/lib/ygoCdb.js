import { MAX_SEARCH_RESULTS } from './constants.js'

/** 開発: Vite proxy / 本番: Vercel api/ygo-search.js */
const SEARCH_API = '/api/ygo-search'

/** @see https://ygocdb.com/api */
export function cardImageUrl(passcode, size = 'half') {
  const id = String(passcode)
  const suffix =
    size === 'thumb' ? '!thumb2' : size === 'full' ? '' : '!half'
  return `https://cdn.233.momobako.com/ygopro/pics/${id}.jpg${suffix}`
}

export function cdbItemToCatalog(item) {
  const passcode = String(item.id)
  const typeLine = item.text?.types ?? ''
  return {
    id: passcode,
    name: item.jp_name || item.sc_name || item.cn_name || item.en_name || passcode,
    nameEn: item.en_name ?? '',
    pack: typeLine.split('\n')[0]?.trim() || '',
    rarity: '',
    imageUrl: cardImageUrl(passcode, 'half'),
    imageThumb: cardImageUrl(passcode, 'thumb'),
    passcode,
    cid: item.cid,
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
 * 百鸽 ygocdb — 日本語名・効果テキストで検索
 */
export async function searchYgoCardsJa(query, { maxResults = MAX_SEARCH_RESULTS, signal } = {}) {
  const trimmed = query.trim()
  if (!trimmed) return []

  const results = []
  let start = 0

  while (results.length < maxResults) {
    const { items, nextStart } = await fetchSearchPage(trimmed, start, signal)

    if (items.length === 0) break

    for (const item of items) {
      results.push(cdbItemToCatalog(item))
      if (results.length >= maxResults) return results
    }

    if (!nextStart) break
    start = nextStart
  }

  return results
}
