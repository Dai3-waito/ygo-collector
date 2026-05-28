import { parseNeuronPackList } from '../src/lib/neuronParse.js'

/** 遊戯王ニューロン「収録」一覧（公式） */
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

  try {
    const upstream = await fetch(
      'https://www.db.yugioh-card.com/yugiohdb/card_list.action?wname=CardSearch&clm=1&request_locale=ja',
      { headers: { 'User-Agent': 'ygo-collector/1.0' } },
    )
    const html = await upstream.text()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'Upstream request failed', packs: [] })
      return
    }

    res.status(200).json({ packs: parseNeuronPackList(html) })
  } catch {
    res.status(502).json({ error: 'Upstream request failed', packs: [] })
  }
}
