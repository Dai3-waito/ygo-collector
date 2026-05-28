export function kataToHira(input) {
  return Array.from(input, (ch) => {
    const code = ch.charCodeAt(0)
    if (code >= 0x30a1 && code <= 0x30f6) return String.fromCharCode(code - 0x60)
    return ch
  }).join('')
}

export function normalizeForSearch(input) {
  return kataToHira(String(input ?? ''))
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[-－ー・/]/g, ' ')
    .replace(/\s+/g, ' ')
}

/** カード名・英語名・パスコードがクエリを満たすか（正規化・トークン AND） */
export function matchesTextQuery(card, query) {
  const q = normalizeForSearch(query)
  if (!q) return true
  const tokens = q.split(' ').filter(Boolean)
  const blob = normalizeForSearch(
    `${card?.name ?? ''} ${card?.nameEn ?? ''} ${card?.passcode ?? ''}`,
  )
  return tokens.every((token) => blob.includes(token))
}
