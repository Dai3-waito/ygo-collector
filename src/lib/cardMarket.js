/** OCG（日本語収録） / TCG（英語収録）の切り分け */

export const MARKET_OCG = 'ocg'
export const MARKET_TCG = 'tcg'

/** @param {'jp'|'en'|'sc'|'ygopro'|string} imageLang */
export function marketFromImageLang(imageLang) {
  const lang = String(imageLang ?? '').toLowerCase()
  if (lang === 'en') return MARKET_TCG
  return MARKET_OCG
}

/** 検索文字列から市場を推定（カード追加フォーム用） */
export function marketFromQuery(query) {
  const q = String(query ?? '').trim()
  if (!q) return MARKET_OCG
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(q)) return MARKET_OCG
  if (/^[a-zA-Z0-9\s'.-]+$/.test(q) && !/^\d{8}$/.test(q)) return MARKET_TCG
  return MARKET_OCG
}

/** コレクション内カードの型番からパック単位の市場を推定 */
export function marketFromPackCards(packCards) {
  let jp = 0
  let en = 0
  for (const card of packCards ?? []) {
    const id = String(card?.id ?? '')
    if (/-EN\d/i.test(id) || /-EN[A-Z]?$/i.test(id)) en += 1
    else if (/-JP/i.test(id)) jp += 1
  }
  if (en > jp) return MARKET_TCG
  if (jp > en) return MARKET_OCG
  return null
}

export function isOcgMarket(market) {
  return market !== MARKET_TCG
}

export function isTcgMarket(market) {
  return market === MARKET_TCG
}

export function marketLabel(market) {
  return isTcgMarket(market) ? 'TCG' : 'OCG'
}

export function preferredSetCodeSuffix(market) {
  return isTcgMarket(market) ? 'EN' : 'JP'
}

export function setPrefixFromCardId(cardId, market = null) {
  const raw = String(cardId ?? '')
  const jp = raw.match(/^([A-Z0-9]{2,8})-JP/i)
  const en = raw.match(/^([A-Z0-9]{2,8})-EN/i)

  if (isTcgMarket(market)) {
    if (en) return en[1].toUpperCase()
    if (jp) return jp[1].toUpperCase()
    return null
  }

  if (jp) return jp[1].toUpperCase()
  if (en) return en[1].toUpperCase()
  return null
}

export function dominantSetPrefix(packCards, market = null) {
  const inferred = market ?? marketFromPackCards(packCards)
  const counts = new Map()

  for (const card of packCards ?? []) {
    const prefix = setPrefixFromCardId(card.id, inferred)
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

export function normalizeSetCodeForMarket(setCode, market) {
  return convertSetCodeToMarket(setCode, market)
}

/** 収録パック名などに市場が明示されているとき */
export function marketFromPackName(packName) {
  const p = String(packName ?? '')
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(p)) return MARKET_OCG
  if (/^[a-zA-Z0-9\s'.:+\-]+$/.test(p.trim()) && p.trim().length >= 3) return MARKET_TCG
  return null
}

export function resolvePackMarket(packName, packCards, imageLang = null) {
  return (
    marketFromPackCards(packCards) ??
    (imageLang != null ? marketFromImageLang(imageLang) : null) ??
    marketFromPackName(packName) ??
    MARKET_OCG
  )
}

/**
 * 検索用の型番正規化。TCG は -JP→-EN。
 * OCG は -EN→-JP（ユーザーが EN 型番を入力したときのみ）。収録一覧の自動変換はしない。
 */
export function convertSetCodeToMarket(setCode, market) {
  const raw = String(setCode ?? '').trim().toUpperCase()
  if (!raw) return raw

  if (isTcgMarket(market)) {
    return raw.replace(/-JP/gi, '-EN')
  }

  if (/-JP/i.test(raw)) return raw
  return raw.replace(/-EN(?=\d)/gi, '-JP').replace(/-EN$/i, '-JP')
}

/** @param {{ setCode: string, setName?: string, rarity: string, isJp?: boolean }} print */
export function adaptPrintToMarket(print, market) {
  const setCode = convertSetCodeToMarket(print.setCode, market)
  return {
    setCode,
    setName: print.setName ?? '',
    rarity: print.rarity ?? '',
    isJp: isOcgMarket(market),
  }
}

function isLikelyTcgExclusivePrint(print) {
  const blob = `${print.setName} ${print.setCode}`.toLowerCase()
  return /speed duel|master duel|ots tournament|tcgplayer|region exclusive/i.test(blob)
}

function dedupePrints(prints) {
  const seen = new Set()
  const out = []
  for (const p of prints) {
    const key = `${p.setCode}|${p.rarity}`
    if (!p.setCode || seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

export function filterPrintsForMarket(prints, market) {
  const list = prints ?? []
  if (!list.length) return list

  if (isTcgMarket(market)) {
    const adapted = list
      .map((p) => adaptPrintToMarket(p, market))
      .filter((p) => /-EN/i.test(p.setCode))
    return dedupePrints(adapted)
  }

  const ocg = list
    .filter((p) => /-JP/i.test(String(p.setCode ?? '')))
    .filter((p) => !isLikelyTcgExclusivePrint(p))
    .map((p) => adaptPrintToMarket(p, market))

  return dedupePrints(ocg)
}

/** 百鸽検索などで得た型番を印刷候補に追加 */
export function printsFromSetCodes(setCodes, market, { rarity = '（レアリティ未設定）' } = {}) {
  return dedupePrints(
    (setCodes ?? []).map((code) =>
      adaptPrintToMarket({ setCode: code, setName: '', rarity }, market),
    ),
  )
}
