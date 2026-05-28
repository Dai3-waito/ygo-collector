import {
  filterPrintsForMarket,
  isOcgMarket,
  marketFromImageLang,
  printsFromSetCodes,
} from './cardMarket.js'
import { fetchNeuronCardPrints, resolveNeuronCid } from './neuronCardApi.js'

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

function mergePrintLists(...lists) {
  const merged = []
  const seen = new Set()
  for (const list of lists) {
    for (const p of list ?? []) {
      const key = `${p.setCode}|${p.rarity}`
      if (!p.setCode || seen.has(key)) continue
      seen.add(key)
      merged.push(p)
    }
  }
  return merged
}

export async function fetchCardPrints(passcode, signal, market = null, options = {}) {
  const m = market ?? marketFromImageLang('jp')
  const fromSearch = printsFromSetCodes(options.setCodesFromSearch, m)

  if (isOcgMarket(m)) {
    const cid =
      options.neuronCid != null
        ? String(options.neuronCid)
        : await resolveNeuronCid(passcode, signal)
    const fromNeuron = cid ? await fetchNeuronCardPrints(cid, signal) : []

    if (fromNeuron.length > 0) {
      return mergePrintLists(fromSearch, fromNeuron).sort((a, b) =>
        a.setCode.localeCompare(b.setCode),
      )
    }
  }

  let res
  try {
    res = await fetch(`${PRINTS_API}?id=${encodeURIComponent(passcode)}`, { signal })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    return fromSearch
  }

  let body = {}
  try {
    body = await res.json()
  } catch {
    body = {}
  }

  if (!res.ok) {
    if (res.status === 400 && body.error?.includes?.('No card')) {
      return fromSearch
    }
    if (fromSearch.length > 0) return fromSearch
    throw new Error(body.error || 'レアリティ情報の取得に失敗しました')
  }

  const card = body.data?.[0]
  if (!card) return fromSearch

  const fromProdeck = filterPrintsForMarket(parseCardPrints(card), m)
  return mergePrintLists(fromSearch, fromProdeck)
}
