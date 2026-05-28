import { marketFromImageLang, marketLabel } from './cardMarket.js'

/** @see https://ygocdb.com/api — cdn.233.momobako.com */
export const IMAGE_LANG_OPTIONS = [
  { code: 'jp', label: '日本語（OCG）' },
  { code: 'en', label: 'English（TCG）' },
  { code: 'sc', label: '簡体中文（OCG）' },
  { code: 'ygopro', label: 'YGOPRO（汎用）' },
]

export function imageLangMarketHint(imageLang) {
  return marketLabel(marketFromImageLang(imageLang))
}

/** 検索文字列から表示言語を推定 */
export function detectImageLangFromQuery(query) {
  const q = String(query ?? '').trim()
  if (!q) return 'jp'
  if (/^[\d-]+$/.test(q)) return 'jp'
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(q)) return 'jp'
  if (/^[a-zA-Z0-9\s'.-]+$/.test(q)) return 'en'
  return 'jp'
}
