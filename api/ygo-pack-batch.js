import {
  neuronPackPageUrl,
  neuronUrlFromLinkValue,
  parseNeuronPackList,
  parseNeuronPackTotal,
} from '../src/lib/neuronParse.js'

const NEURON_LIST_URL =
  'https://www.db.yugioh-card.com/yugiohdb/card_list.action?wname=CardSearch&clm=1&request_locale=ja'

let neuronListCache = null
let neuronListCacheAt = 0
const CACHE_MS = 60 * 60 * 1000

async function getNeuronList() {
  if (neuronListCache && Date.now() - neuronListCacheAt < CACHE_MS) {
    return neuronListCache
  }
  const res = await fetch(NEURON_LIST_URL, {
    headers: { 'User-Agent': 'ygo-collector/1.0' },
  })
  const html = await res.text()
  neuronListCache = parseNeuronPackList(html)
  neuronListCacheAt = Date.now()
  return neuronListCache
}

function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[・\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchPackEntry(packName, setPrefix, list) {
  const n = normalize(packName)
  const ascii = packName.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
  let best = null
  let bestScore = 0

  for (const entry of list) {
    if (/\+1|ボーナス/i.test(entry.name) && !/\+1|ボーナス/i.test(packName)) continue
    const en = normalize(entry.name)
    let score = 0
    if (n && en && (n === en || n.includes(en) || en.includes(n))) score = 100
    if (ascii && en.includes(ascii)) score = Math.max(score, 90)
    if (setPrefix && entry.name.toUpperCase().includes(setPrefix)) score = Math.max(score, 85)
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }
  return bestScore >= 55 ? best : null
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  let body = {}
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}
  } catch {
    body = {}
  }

  const packs = body.packs ?? []
  if (!Array.isArray(packs) || packs.length === 0) {
    res.status(400).json({ error: 'packs array required' })
    return
  }

  try {
    const list = await getNeuronList()
    const results = []

    for (const item of packs.slice(0, 30)) {
      const packName = String(item.pack ?? item.name ?? '').trim()
      const setPrefix = String(item.setPrefix ?? '').trim().toUpperCase()
      if (!packName) continue

      const matched = matchPackEntry(packName, setPrefix, list)
      const pid = matched?.pid
      let total = null
      let url = matched?.url ?? null

      if (pid) {
        url = url || neuronPackPageUrl(pid)
        const upstream = await fetch(url, { headers: { 'User-Agent': 'ygo-collector/1.0' } })
        const html = await upstream.text()
        total = parseNeuronPackTotal(html)
      }

      if (!pid && setPrefix) {
        try {
          const pd = await fetch(
            `https://db.ygoprodeck.com/api/v7/cardsetsinfo.php?setcode=${encodeURIComponent(setPrefix)}`,
            { headers: { 'User-Agent': 'ygo-collector/1.0' } },
          )
          const arr = await pd.json()
          if (Array.isArray(arr) && arr.length > 0) total = arr.length
        } catch {
          // ignore
        }
      }

      results.push({ pack: packName, pid, total, url, setPrefix })
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')
    res.status(200).json({ results })
  } catch {
    res.status(502).json({ error: 'Pack resolution failed' })
  }
}
