import {
  neuronPackPageUrl,
  parseNeuronPackRarities,
} from '../src/lib/neuronParse.js'

/** 遊戯王ニューロン — 収録パックのレアリティ内訳 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.status(204).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const pid = String(req.query.pid ?? '').trim()
  if (!pid) {
    res.status(400).json({ error: 'pid is required' })
    return
  }

  try {
    const url = neuronPackPageUrl(pid)
    const upstream = await fetch(url, { headers: { 'User-Agent': 'ygo-collector/1.0' } })
    const html = await upstream.text()
    const counts = parseNeuronPackRarities(html)

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')

    if (!counts) {
      res.status(404).json({ error: 'Rarity breakdown not found', pid, url })
      return
    }

    res.status(200).json({
      pid,
      url,
      rarities: Object.fromEntries(counts),
    })
  } catch {
    res.status(502).json({ error: 'Upstream request failed' })
  }
}
