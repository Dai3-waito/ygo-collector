const CARDSETS_URL = 'https://db.ygoprodeck.com/api/v7/cardsets.php'
const CARDINFO_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'
const HEADERS = { 'User-Agent': 'ygo-collector/1.0' }

export async function resolveSetNameForCode(setcode, signal) {
  const code = String(setcode ?? '').trim().toUpperCase()
  if (!code) return null

  const res = await fetch(CARDSETS_URL, { headers: HEADERS, signal })
  let sets = []
  try {
    sets = await res.json()
  } catch {
    sets = []
  }
  if (!Array.isArray(sets)) return null

  const matches = sets.filter((s) => String(s?.set_code ?? '').toUpperCase() === code)
  const best = matches.sort(
    (a, b) => Number(b?.num_of_cards ?? 0) - Number(a?.num_of_cards ?? 0),
  )[0]
  return best?.set_name?.trim() ?? null
}

/**
 * @returns {Promise<{ setName: string, total: number, counts: Map<string, number> }|null>}
 */
export async function aggregateSetRarities(setcode, setName, signal) {
  const code = String(setcode ?? '').trim().toUpperCase()
  if (!code) return null

  let name = setName?.trim() || null
  if (!name) name = await resolveSetNameForCode(code, signal)
  if (!name) return null

  const prefix = `${code}-`
  const counts = new Map()
  let totalInSet = 0
  const PAGE = 100
  let offset = 0

  for (;;) {
    const url = `${CARDINFO_URL}?cardset=${encodeURIComponent(name)}&num=${PAGE}&offset=${offset}`
    const pageRes = await fetch(url, { headers: HEADERS, signal })
    let body = {}
    try {
      body = await pageRes.json()
    } catch {
      body = {}
    }

    if (!pageRes.ok || body.error) break

    const cards = body.data ?? []
    if (cards.length === 0) break

    for (const card of cards) {
      for (const row of card.card_sets ?? []) {
        const rowCode = String(row?.set_code ?? '').toUpperCase()
        if (!rowCode.startsWith(prefix)) continue
        const rarity = String(row?.set_rarity ?? '').trim() || '（不明）'
        counts.set(rarity, (counts.get(rarity) ?? 0) + 1)
        totalInSet += 1
      }
    }

    if (cards.length < PAGE) break
    offset += PAGE
    if (offset > 5000) break
  }

  if (totalInSet === 0) return null

  return { setName: name, total: totalInSet, counts }
}
