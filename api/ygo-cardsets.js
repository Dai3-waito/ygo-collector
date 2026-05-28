/** YGOPRODeck — 全カードセット一覧（公式種類数の参照） */
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
    const upstream = await fetch('https://db.ygoprodeck.com/api/v7/cardsets.php', {
      headers: { 'User-Agent': 'ygo-collector/1.0' },
    })
    const text = await upstream.text()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')
    res.status(upstream.status).send(text)
  } catch {
    res.status(502).json({ error: 'Upstream request failed' })
  }
}
