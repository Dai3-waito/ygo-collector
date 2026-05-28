const PRINTS_API = '/api/ygo-prints'

function isJpSetCode(setCode) {
  return /-JP\d*$|-JP[A-Z]?$/i.test(setCode ?? '')
}

/**
 * @returns {{ setCode: string, setName: string, rarity: string, isJp: boolean }[]}
 */
export function parseCardPrints(apiCard) {
  const sets = apiCard?.card_sets ?? []
  const seen = new Set()
  const prints = []

  for (const set of sets) {
    const setCode = set.set_code?.trim()
    const rarity = set.set_rarity?.trim()
    if (!setCode || !rarity) continue
    const key = `${setCode}|${rarity}`
    if (seen.has(key)) continue
    seen.add(key)
    prints.push({
      setCode,
      setName: set.set_name ?? '',
      rarity,
      isJp: isJpSetCode(setCode),
    })
  }

  prints.sort((a, b) => {
    if (a.isJp !== b.isJp) return a.isJp ? -1 : 1
    return a.setCode.localeCompare(b.setCode)
  })

  return prints
}

export async function fetchCardPrints(passcode, signal) {
  const res = await fetch(`${PRINTS_API}?id=${encodeURIComponent(passcode)}`, { signal })
  let body = {}
  try {
    body = await res.json()
  } catch {
    body = {}
  }

  if (!res.ok) {
    if (res.status === 400 && body.error?.includes?.('No card')) {
      return []
    }
    throw new Error(body.error || 'レアリティ情報の取得に失敗しました')
  }

  const card = body.data?.[0]
  if (!card) return []
  return parseCardPrints(card)
}
