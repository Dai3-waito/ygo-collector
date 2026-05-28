/** YGOPRODeck — カード名 fuzzy 検索（CORS 回避） */
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

  const fname = String(req.query.fname ?? req.query.q ?? '').trim()
  const type = String(req.query.type ?? '').trim()
  const race = String(req.query.race ?? '').trim()
  const attribute = String(req.query.attribute ?? '').trim()
  const level = String(req.query.level ?? '').trim()
  const archetype = String(req.query.archetype ?? '').trim()

  if (fname.length < 2 && !type && !race && !attribute && !level && !archetype) {
    res.status(400).json({ error: 'fname, type, race, attribute, archetype, or level is required' })
    return
  }

  const num = String(req.query.num ?? '100')
  const offset = String(req.query.offset ?? '0')
  const params = new URLSearchParams({ num, offset, misc: 'yes' })
  if (fname.length >= 2) params.set('fname', fname)
  if (type) params.set('type', type)
  if (race) params.set('race', race)
  if (attribute) params.set('attribute', attribute)
  if (level) params.set('level', level)
  if (archetype) params.set('archetype', archetype)

  try {
    const upstream = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?${params}`,
      { headers: { 'User-Agent': 'ygo-collector/1.0' } },
    )
    const text = await upstream.text()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')

    if (upstream.status === 400) {
      res.status(200).send(JSON.stringify({ data: [], meta: { total_rows: 0 } }))
      return
    }

    res.status(upstream.status).send(text)
  } catch {
    res.status(502).json({ error: 'Upstream request failed' })
  }
}
