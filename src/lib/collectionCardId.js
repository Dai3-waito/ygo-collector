import { canonicalRarityKey } from './rarityLabels.js'

const ID_SEP = '#'

/** 型番 + レアリティでコレクション内の一意 ID（別レアリティは別枠） */
export function collectionCardId(setCode, rarity) {
  const code = String(setCode ?? '').trim().toUpperCase()
  const rKey = canonicalRarityKey(rarity?.trim() || '（レアリティ未設定）')
  return `${code}${ID_SEP}${rKey}`
}

/** 登録 ID から型番を取り出す（旧データは型番のみの ID のまま） */
export function setCodeFromCollectionId(id) {
  const raw = String(id ?? '').trim()
  const sep = raw.indexOf(ID_SEP)
  return (sep >= 0 ? raw.slice(0, sep) : raw).trim().toUpperCase()
}

/** 同一型番かつ同一レアリティ（枚数加算対象） */
export function collectionCardsMatch(a, b) {
  const setA = setCodeFromCollectionId(a?.setCode ?? a?.id)
  const setB = setCodeFromCollectionId(b?.setCode ?? b?.id)
  if (!setA || !setB || setA !== setB) return false
  return canonicalRarityKey(a?.rarity) === canonicalRarityKey(b?.rarity)
}

/** @param {object[]} cards */
export function findCollectionMatch(cards, candidate) {
  return cards.find((c) => collectionCardsMatch(c, candidate)) ?? null
}
