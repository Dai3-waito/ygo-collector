/** レアリティ表記ゆれ（日英・YGOPRODeck / ニューロン）を同一キーに寄せる */

const RULES = [
  { key: 'quarter_century', test: (r) => /quarter century|クォーター・センチュリー|２５th/i.test(r) },
  { key: 'prismatic_secret', test: (r) => /prismatic secret|プリズマティックシークレット/i.test(r) },
  { key: 'starlight', test: (r) => /starlight|スターライト/i.test(r) },
  { key: 'ultimate', test: (r) => /ultimate|アルティメット|ウルティメット/i.test(r) },
  { key: 'secret', test: (r) => /secret|シークレット/i.test(r) },
  { key: 'ultra', test: (r) => /ultra|ウルトラ/i.test(r) },
  { key: 'super', test: (r) => /super|スーパー/i.test(r) },
  { key: 'holographic', test: (r) => /holographic|ホログラフィック/i.test(r) },
  {
    key: 'rare',
    test: (r) =>
      (/^rare$/i.test(r) || /\bレア\b/.test(r) || /^レア仕様/.test(r)) &&
      !/スーパー|ウルトラ|シークレット|アルティ|プリズマ|ホロ|クォーター|スター/i.test(r),
  },
  { key: 'common', test: (r) => /common|ノーマル|通常|normal/i.test(r) },
]

export function canonicalRarityKey(name) {
  const raw = String(name ?? '').trim()
  if (!raw || raw === '（レアリティ未設定）') return 'unknown'
  const r = raw.toLowerCase()
  for (const rule of RULES) {
    if (rule.test(r) || rule.test(raw)) return rule.key
  }
  return `raw:${raw.toLowerCase()}`
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
