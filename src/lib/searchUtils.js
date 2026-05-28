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
