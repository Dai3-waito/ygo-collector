import { cardImageUrl, lookupCdbBySetCode } from './ygoCdb.js'

/** @param {{ id?: string, passcode?: string, imageUrl?: string }} card */
export function passcodeFromCard(card) {
  const explicit = String(card?.passcode ?? '').trim()
  if (/^\d{8}$/.test(explicit)) return explicit

  const id = String(card?.id ?? '').trim()
  if (/^\d{8}$/.test(id)) return id

  const stored = String(card?.imageUrl ?? '')
  const fromUrl = stored.match(/\/(\d{8})\.(?:webp|jpg)/i)
  return fromUrl?.[1] ?? null
}

function isMissingLocalImage(url) {
  return String(url ?? '').startsWith('/cards/')
}

/** cid だけの百鸽 URL は 404 になりやすい */
function isLikelyBrokenCdbImageUrl(url) {
  const m = String(url ?? '').match(/ygoimg\/jp\/(\d+)\.webp/i)
  return m != null && m[1].length > 0 && m[1].length < 8
}

/** @param {{ id?: string, passcode?: string, imageUrl?: string }} card */
export function collectionImageCandidates(card, customSrc = '') {
  const list = []
  if (customSrc) list.push(customSrc)

  const passcode = passcodeFromCard(card)
  const stored = String(card?.imageUrl ?? '').trim()

  if (stored && !isMissingLocalImage(stored) && !isLikelyBrokenCdbImageUrl(stored)) {
    list.push(stored)
  }

  if (passcode) {
    list.push(cardImageUrl(passcode, { lang: 'jp', size: 'full' }))
    list.push(cardImageUrl(passcode, { lang: 'ygopro', size: 'full' }))
  }

  return [...new Set(list.filter(Boolean))]
}

/** 型番から百鸽でパスワードを引く（既存データの画像復旧用） */
export async function resolvePasscodeBySetCode(setCode, signal) {
  const code = String(setCode ?? '').trim().toUpperCase()
  if (!/^[A-Z0-9]{2,8}-JP[A-Z0-9]{0,4}$/i.test(code)) return null
  const hit = await lookupCdbBySetCode(code, { signal, imageLang: 'jp' })
  const passcode = hit?.passcode ?? hit?.id
  return /^\d{8}$/.test(String(passcode ?? '')) ? String(passcode) : null
}
