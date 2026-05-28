import { neuronPackPageUrl, parseNeuronPackTotal } from '../src/lib/neuronParse.js'

/** 遊戯王ニューロン — 収録パックの公式枚数 */
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
    const total = parseNeuronPackTotal(html)

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')
    res.status(200).json({
      pid,
      total: total != null && total > 0 ? total : null,
      url,
    })
  } catch {
    res.status(502).json({ error: 'Upstream request failed' })
  }
}
