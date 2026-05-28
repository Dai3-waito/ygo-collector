/**
 * Vercel serverless proxy — ブラウザから YGOPRODeck へ直接 fetch すると
 * 環境によって失敗することがあるため、同一オリジン経由で中継する。
 */
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

  const fname = String(req.query.fname ?? '').trim()
  if (fname.length < 2) {
    res.status(400).json({ error: 'fname must be at least 2 characters' })
    return
  }

  const params = new URLSearchParams({
    fname,
    num: String(req.query.num ?? '100'),
    offset: String(req.query.offset ?? '0'),
    misc: String(req.query.misc ?? 'yes'),
  })

  try {
    const upstream = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?${params}`,
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
