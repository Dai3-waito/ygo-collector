/**
 * 百鸽 ygocdb.com プロキシ（日本語検索・CORS 回避）
 * @see https://ygocdb.com/api
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

  const search = String(req.query.search ?? req.query.fname ?? '').trim()
  if (search.length < 2) {
    res.status(400).json({ error: 'search must be at least 2 characters' })
    return
  }

  const start = String(req.query.start ?? req.query.offset ?? '0')
  const params = new URLSearchParams({ search, start })

  try {
    const upstream = await fetch(`https://ygocdb.com/api/v0/?${params}`, {
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
