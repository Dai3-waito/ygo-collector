import { packCatalog } from '../data/packCatalog.js'

/** 表記ゆれ → 照合用の英語セット名（YGOPRODeck / ニューロン） */
const PACK_NAME_ALIASES = {
  blazingdominacion: 'blazing dominion',
  'blazing domination': 'blazing dominion',
  'blazing dominacion': 'blazing dominion',
}

function aliasNormalizedPackName(packName) {
  const compact = String(packName ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\s+/g, '')
  const lower = String(packName ?? '').trim().toLowerCase()
  return PACK_NAME_ALIASES[compact] ?? PACK_NAME_ALIASES[lower] ?? null
}

/** パック名を packCatalog の正規ラベルに寄せる */
export function resolveCanonicalPackName(packName) {
  if (!packName?.trim()) return packName ?? ''

  const trimmed = packName.trim()
  const alias = aliasNormalizedPackName(trimmed)
  if (alias) {
    for (const [label, meta] of Object.entries(packCatalog)) {
      if (label.toLowerCase() === alias) return label
      if (meta.deckSetName?.toLowerCase() === alias) return label
    }
    return alias
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  const lower = trimmed.toLowerCase()

  const compact = trimmed.replace(/\s+/g, '').toUpperCase()

  for (const [label, meta] of Object.entries(packCatalog)) {
    if (label.toLowerCase() === lower) return label
    if (meta.deckSetName?.toLowerCase() === lower) return label
    if (label.replace(/\s+/g, '').toUpperCase() === compact) return label
  }

  return trimmed
}
