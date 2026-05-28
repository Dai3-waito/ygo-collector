import {
  cardTypesMatchIntent,
  categoryMatchScore,
  resolveCategoryIntent,
} from './cardCategory.js'
import { normalizeForSearch } from './searchUtils.js'

/** 検索結果の名前フィールドに正規化して格納 */
function nameFields(item) {
  return {
    jp: normalizeForSearch(item.jp_name),
    ruby: normalizeForSearch(item.jp_ruby),
    en: normalizeForSearch(item.en_name),
    cn: normalizeForSearch(item.sc_name ?? item.cn_name ?? item.md_name),
  }
}

/**
 * 百鸽の weight + 名前一致度で関連度スコア（高いほど上位）
 */
export function scoreSearchItem(item, query) {
  const raw = String(query ?? '').trim()
  const qNorm = normalizeForSearch(raw)
  const tokens = qNorm.split(' ').filter(Boolean)
  const fields = nameFields(item)
  const passcode = String(item.id ?? '')

  let score = Number(item.weight) || 0

  if (/^\d{8}$/.test(raw) && passcode === raw) return 10000 + score
  if (qNorm && fields.jp === qNorm) score += 900
  if (qNorm && fields.en === qNorm) score += 850
  if (qNorm && fields.jp.startsWith(qNorm)) score += 500
  if (qNorm && fields.ruby.includes(qNorm)) score += 350

  if (tokens.length === 0) return score

  let allInName = true
  let anyInName = false

  for (const token of tokens) {
    const inJp = fields.jp.includes(token)
    const inRuby = fields.ruby.includes(token)
    const inEn = fields.en.includes(token)
    const inCn = fields.cn.includes(token)
    const inName = inJp || inRuby || inEn || inCn

    if (inName) {
      anyInName = true
      if (fields.jp === token) score += 200
      else if (fields.jp.startsWith(token)) score += 140
      else if (inRuby) score += 100
      else if (inEn) score += 60
      else score += 35
    } else {
      allInName = false
      score -= 40
    }
  }

  if (allInName) score += 150
  if (!anyInName) score -= 120

  score += categoryMatchScore(item.text?.types, raw)

  return score
}

export function isStrongNameMatch(item, query) {
  const score = scoreSearchItem(item, query)
  const qNorm = normalizeForSearch(query)
  const fields = nameFields(item)
  return (
    score >= 200 ||
    fields.jp === qNorm ||
    fields.jp.startsWith(qNorm) ||
    normalizeForSearch(item.jp_ruby).includes(qNorm)
  )
}

/**
 * パスワード重複を除き、関連度順に並べ替え
 */
export function rankSearchResults(items, query) {
  const categoryIntent = resolveCategoryIntent(query)
  const byPasscode = new Map()

  for (const item of items) {
    const passcode = String(item.id ?? '')
    if (!passcode) continue
    const score = scoreSearchItem(item, query)
    const prev = byPasscode.get(passcode)
    if (!prev || score > prev._score) {
      byPasscode.set(passcode, { ...item, _score: score })
    }
  }

  const ranked = [...byPasscode.values()].sort((a, b) => b._score - a._score)

  const qNorm = normalizeForSearch(query)
  const hasStrong = ranked.some((item) => isStrongNameMatch(item, query))

  let filtered = ranked.filter((item, index) => {
    if (index < 30) return true
    if (!hasStrong) return item._score >= 40
    return item._score >= 70 || isStrongNameMatch(item, query)
  })

  if (categoryIntent) {
    const typeMatches = filtered.filter((item) =>
      cardTypesMatchIntent(item.text?.types, categoryIntent),
    )
    if (typeMatches.length > 0) filtered = typeMatches
  }

  return filtered
}
