import { canonicalRarityKey } from './rarityLabels.js'

/** レアリティ内訳 Map の合計（YGOPRODeck 等・印刷行ベース） */
export function sumRarityCountMap(map) {
  if (!map?.size) return 0
  let sum = 0
  for (const n of map.values()) {
    const v = Number(n)
    if (Number.isFinite(v) && v > 0) sum += Math.floor(v)
  }
  return sum
}

/** ニューロン収録名から英語セット名を抽出（例: ブレイジング・ドミニオン [BLAZING DOMINION]） */
export function englishNameFromNeuronEntry(neuronName) {
  const bracket = String(neuronName ?? '').match(/\[([^\]]+)\]/)
  return bracket?.[1]?.trim() ?? null
}

/** パック内のユニーク種類数（card.id 単位） */
export function countUniqueCardKinds(cards, { ownedOnly = false } = {}) {
  const ids = new Set()
  for (const card of cards) {
    if (ownedOnly && (card.owned ?? 0) <= 0) continue
    if (card.id) ids.add(card.id)
  }
  return ids.size
}

/** レアリティごとのユニーク種類数（card.id 単位） */
export function countUniqueKindsByRarity(cards, { ownedOnly = false } = {}) {
  const byKey = new Map()
  for (const card of cards) {
    if (ownedOnly && (card.owned ?? 0) <= 0) continue
    const key = canonicalRarityKey(card.rarity?.trim() || '（レアリティ未設定）')
    if (!byKey.has(key)) byKey.set(key, new Set())
    if (card.id) byKey.get(key).add(card.id)
  }
  const counts = new Map()
  for (const [key, ids] of byKey) {
    counts.set(key, ids.size)
  }
  return counts
}
