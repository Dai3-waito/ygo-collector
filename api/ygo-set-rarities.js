import { aggregateSetRarities } from '../src/lib/prodeckSetRarities.js'

/** YGOPRODeck — セット型番ごとのレアリティ内訳 */
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

  const setcode = String(req.query.setcode ?? '').trim().toUpperCase()
  const setname = String(req.query.setname ?? '').trim()

  if (!setcode) {
    res.status(400).json({ error: 'setcode is required' })
    return
  }

  try {
    const result = await aggregateSetRarities(setcode, setname || null)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')

    if (!result) {
      res.status(404).json({ error: 'No cards found for set', setcode })
      return
    }

    const rarities = Object.fromEntries(result.counts)
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
    res.status(200).json({
      setcode,
      setName: result.setName,
      total: result.total,
      rarities,
    })
  } catch {
    res.status(502).json({ error: 'Upstream request failed' })
  }
}
