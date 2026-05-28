import { neuronCardPageUrl, parseNeuronCardPrints } from '../src/lib/neuronParse.js'

/** 遊戯王ニューロン — カードの OCG 収録（型番・レアリティ） */
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

  const cid = String(req.query.cid ?? '').trim()
  if (!cid) {
    res.status(400).json({ error: 'cid is required' })
    return
  }

  try {
    const url = neuronCardPageUrl(cid)
    const upstream = await fetch(url, { headers: { 'User-Agent': 'ygo-collector/1.0' } })
    const html = await upstream.text()
    const prints = parseNeuronCardPrints(html)

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')
    res.status(200).json({
      cid,
      url,
      prints,
    })
  } catch {
    res.status(502).json({ error: 'Upstream request failed' })
  }
}
