/**
 * OCG 公式レアリティ略称: N, R, SR, UR, SE, UL, PSE ほか
 * YGOPRODeck / ニューロン / 登録表記のゆれを同一キーに寄せる
 */

export const RARITY_META = {
  prismatic_secret: { abbr: 'PSE', name: 'プリズマティックシークレットレア' },
  quarter_century: { abbr: 'QCSE', name: 'クォーターセンチュリーシークレットレア' },
  ultimate: { abbr: 'UL', name: 'アルティメットレア' },
  secret: { abbr: 'SE', name: 'シークレットレア' },
  ultra: { abbr: 'UR', name: 'ウルトラレア' },
  super: { abbr: 'SR', name: 'スーパーレア' },
  rare: { abbr: 'R', name: 'レア' },
  common: { abbr: 'N', name: 'ノーマル' },
  starlight: { abbr: 'SLR', name: 'スターライトレア' },
  holographic: { abbr: 'HOLO', name: 'ホログラフィックレア' },
  unknown: { abbr: '?', name: 'レアリティ未設定' },
}

/** 高レア寄りの表示順 */
export const RARITY_ORDER_KEYS = [
  'quarter_century',
  'prismatic_secret',
  'starlight',
  'ultimate',
  'secret',
  'ultra',
  'super',
  'rare',
  'common',
  'holographic',
]

const ABBR_TO_KEY = {
  n: 'common',
  r: 'rare',
  sr: 'super',
  ur: 'ultra',
  se: 'secret',
  ul: 'ultimate',
  pse: 'prismatic_secret',
  qcse: 'quarter_century',
  slr: 'starlight',
}

const RULES = [
  { key: 'prismatic_secret', test: (r) => /^pse$/i.test(r) || /prismatic secret|プリズマティックシークレット/i.test(r) },
  {
    key: 'quarter_century',
    test: (r) => /^qcse$/i.test(r) || /quarter century|クォーター・センチュリー|２５th/i.test(r),
  },
  { key: 'ultimate', test: (r) => /^ul$/i.test(r) || /ultimate|アルティメット|ウルティメット/i.test(r) },
  { key: 'secret', test: (r) => /^se$/i.test(r) || /secret|シークレット/i.test(r) },
  { key: 'ultra', test: (r) => /^ur$/i.test(r) || /ultra|ウルトラ/i.test(r) },
  { key: 'super', test: (r) => /^sr$/i.test(r) || /super|スーパー/i.test(r) },
  { key: 'starlight', test: (r) => /^slr$/i.test(r) || /starlight|スターライト/i.test(r) },
  { key: 'holographic', test: (r) => /holographic|ホログラフィック/i.test(r) },
  {
    key: 'rare',
    test: (r) =>
      /^r$/i.test(r) ||
      ((/^rare$/i.test(r) || /\bレア\b/.test(r) || /^レア仕様/.test(r)) &&
        !/スーパー|ウルトラ|シークレット|アルティ|プリズマ|ホロ|クォーター|スター/i.test(r)),
  },
  {
    key: 'common',
    test: (r) =>
      /^n$/i.test(r) || /common|ノーマル|通常|^normal$/i.test(r),
  },
]

export function canonicalRarityKey(name) {
  const raw = String(name ?? '').trim()
  if (!raw || raw === '（レアリティ未設定）') return 'unknown'

  const compact = raw.replace(/\s+/g, '').toLowerCase()
  if (ABBR_TO_KEY[compact]) return ABBR_TO_KEY[compact]

  const r = raw.toLowerCase()
  for (const rule of RULES) {
    if (rule.test(r) || rule.test(raw)) return rule.key
  }
  return `raw:${raw.toLowerCase()}`
}

export function rarityAbbrev(canonicalKey) {
  return RARITY_META[canonicalKey]?.abbr ?? canonicalKey.toUpperCase()
}

export function rarityFullName(canonicalKey) {
  return RARITY_META[canonicalKey]?.name ?? canonicalKey
}

/** UI 表示用（略称メイン） */
export function displayRarityLabel(canonicalKey, _rawFallback) {
  return rarityAbbrev(canonicalKey)
}

export function raritySortKey(canonicalKey) {
  const idx = RARITY_ORDER_KEYS.indexOf(canonicalKey)
  return idx >= 0 ? idx : 99
}

export function mergeRarityCountMaps(...maps) {
  const merged = new Map()
  const labels = new Map()

  for (const map of maps) {
    if (!map) continue
    for (const [label, count] of map.entries()) {
      const key = canonicalRarityKey(label)
      const n = Number(count)
      if (!Number.isFinite(n) || n < 1) continue
      merged.set(key, (merged.get(key) ?? 0) + Math.floor(n))
      if (!labels.has(key)) labels.set(key, label)
    }
  }

  return { counts: merged, labels }
}
