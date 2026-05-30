/** OFUSE 支援ページ URL（Vite 環境変数） */
export function getOfuseUrl() {
  return String(import.meta.env.VITE_OFUSE_URL ?? '').trim()
}

export function isOfuseConfigured() {
  return getOfuseUrl().length > 0
}
