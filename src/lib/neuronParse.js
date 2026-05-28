/** 遊戯王ニューロン HTML の解析（API・開発サーバー共通） */

const NEURON_ORIGIN = 'https://www.db.yugioh-card.com'

/** 収録一覧の link_value を公式の絶対URLに */
export function neuronUrlFromLinkValue(linkPath) {
  const raw = String(linkPath ?? '').trim()
  if (!raw) return null

  try {
    const url = raw.startsWith('http')
      ? new URL(raw)
      : new URL(raw.startsWith('/') ? raw : `/${raw}`, NEURON_ORIGIN)

    if (!url.searchParams.has('request_locale')) {
      url.searchParams.set('request_locale', 'ja')
    }
    return url.toString()
  } catch {
    return null
  }
}

export function parseNeuronPackList(html) {
  const packs = []
  const seen = new Set()
  const re =
    /<p>([^<]*)<\/p>\s*<input[^>]*class="link_value"[^>]*value="([^"]+)"/gi

  let match
  while ((match = re.exec(html)) !== null) {
    const name = match[1].trim()
    const linkPath = match[2].trim()
    const pidMatch = linkPath.match(/[?&]pid=(\d+)/i)
    const pid = pidMatch?.[1]
    if (!name || !pid || seen.has(pid)) continue
    seen.add(pid)

    packs.push({
      name,
      pid,
      url: neuronUrlFromLinkValue(linkPath),
    })
  }

  return packs
}

export function parseNeuronPackTotal(html) {
  const ja = html.match(/全(\d+)枚/)
  if (ja) return Number(ja[1])

  const en = html.match(/Total of (\d+) Card/i)
  if (en) return Number(en[1])

  return null
}

/** 収録ページのカードごとのレアリティ仕様を集計（公式・日本語表記） */
export function parseNeuronPackRarities(html) {
  const counts = new Map()
  const re = /<span[^>]*>\s*([^<]*(?:レア|ノーマル|プリズマ|ホロ)仕様)\s*<\/span>/gi

  for (const match of html.matchAll(re)) {
    const label = match[1].trim().replace(/仕様$/, '')
    if (!label) continue
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  return counts.size > 0 ? counts : null
}

/** pid から収録ページURL（一覧の link_value が無いときの予備） */
export function neuronPackPageUrl(pid) {
  const params = new URLSearchParams({
    ope: '1',
    sess: '1',
    pid: String(pid),
    request_locale: 'ja',
    rp: '99999',
  })
  return `${NEURON_ORIGIN}/yugiohdb/card_search.action?${params}`
}
