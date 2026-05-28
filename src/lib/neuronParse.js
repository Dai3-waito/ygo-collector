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

/** lr_icon の rid → 日本語レアリティ名（収録ページ共通） */
function buildNeuronRidLabelMap(html) {
  const ridToLabel = new Map()
  const re =
    /class="lr_icon rid rid_(\d+)"[^>]*>[\s\S]*?<span[^>]*>\s*([^<]*(?:レア|ノーマル|プリズマ|ホロ)仕様)\s*<\/span>/gi

  for (const match of html.matchAll(re)) {
    const rid = match[1]
    if (ridToLabel.has(rid)) continue
    const label = match[2].trim().replace(/仕様$/, '')
    if (label) ridToLabel.set(rid, label)
  }
  return ridToLabel
}

/**
 * 収録ページのレアリティ内訳（カード種類 × レアリティ単位）
 * 各カード行の t_rid_* を数え、仕様アイコン総数（印刷枠）とは別に公式の種類数に合わせる
 */
export function parseNeuronPackRarities(html) {
  const ridToLabel = buildNeuronRidLabelMap(html)
  if (ridToLabel.size === 0) return null

  const counts = new Map()
  let rowCount = 0
  const rowRe = /<div class="t_row c_normal([^"]*)"[^>]*>/g

  for (const match of html.matchAll(rowRe)) {
    rowCount += 1
    const seenRids = new Set()
    for (const ridMatch of match[1].matchAll(/\bt_rid_(\d+)\b/g)) {
      const rid = ridMatch[1]
      if (seenRids.has(rid)) continue
      seenRids.add(rid)
      const label = ridToLabel.get(rid)
      if (!label) continue
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
  }

  if (counts.size === 0) return null

  const officialTotal = parseNeuronPackTotal(html)
  if (officialTotal != null && rowCount > 0 && rowCount !== officialTotal) {
    return null
  }

  return counts
}

/** 百鸽 cid / ニューロン cid からカード詳細（収録パック一覧） */
export function neuronCardPageUrl(cid) {
  const params = new URLSearchParams({
    ope: '2',
    cid: String(cid),
    request_locale: 'ja',
  })
  return `${NEURON_ORIGIN}/yugiohdb/card_search.action?${params}`
}

/**
 * カード詳細ページの OCG 印刷一覧（型番・パック名・レアリティ）
 * @returns {{ setCode: string, setName: string, rarity: string, isJp: boolean }[]}
 */
export function parseNeuronCardPrints(html) {
  const prints = []
  const seen = new Set()
  const rowRe =
    /card_number">\s*([A-Z0-9]{2,8}-JP[A-Z0-9]{0,4})\s*<\/div>\s*<div class="pack_name[^"]*"[^>]*>\s*([^<]+)\s*<\/div>[\s\S]*?<span[^>]*>\s*([^<]+(?:レア|ノーマル|プリズマ|ホロ)[^<]*)\s*<\/span>/gi

  for (const match of String(html ?? '').matchAll(rowRe)) {
    const setCode = match[1].trim().toUpperCase()
    const setName = match[2].trim()
    const rarity = match[3].trim().replace(/仕様$/, '')
    if (!setCode || !rarity) continue
    const key = `${setCode}|${rarity}`
    if (seen.has(key)) continue
    seen.add(key)
    prints.push({ setCode, setName, rarity, isJp: true })
  }

  prints.sort((a, b) => a.setCode.localeCompare(b.setCode))
  return prints
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
