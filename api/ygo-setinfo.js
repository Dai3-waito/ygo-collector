/** YGOPRODeck — セットコード別の収録一覧（種類数の算出用） */
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

  const setcode = String(req.query.setcode ?? '').trim()
  if (!setcode) {
    res.status(400).json({ error: 'setcode is required' })
    return
  }

  try {
    const upstream = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardsetsinfo.php?setcode=${encodeURIComponent(setcode)}`,
      { headers: { 'User-Agent': 'ygo-collector/1.0' } },
    )
    const text = await upstream.text()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')
    res.status(upstream.status).send(text)
  } catch {
    res.status(502).json({ error: 'Upstream request failed' })
  }
}
