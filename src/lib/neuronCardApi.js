import { neuronCardPageUrl, parseNeuronCardPrints } from './neuronParse.js'

const CARD_API = '/api/ygo-neuron-card'
const SEARCH_API = '/api/ygo-search'

/** パスワードから百鸽 cid を取得（ニューロン cid と同一） */
export async function resolveNeuronCid(passcode, signal) {
  const id = String(passcode ?? '').trim()
  if (!/^\d{8}$/.test(id)) return null

  let res
  try {
    const params = new URLSearchParams({ search: id, start: '0' })
    res = await fetch(`${SEARCH_API}?${params}`, { signal })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    return null
  }

  let body = {}
  try {
    body = await res.json()
  } catch {
    return null
  }

  if (!res.ok) return null

  const hit = (body.result ?? []).find((item) => String(item.id) === id)
  return hit?.cid != null ? String(hit.cid) : null
}

/** ニューロン公式の OCG 収録（型番・レアリティ） */
export async function fetchNeuronCardPrints(cid, signal) {
  const c = String(cid ?? '').trim()
  if (!c) return []

  let res
  try {
    res = await fetch(`${CARD_API}?cid=${encodeURIComponent(c)}`, { signal })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    return []
  }

  let body = {}
  try {
    body = await res.json()
  } catch {
    return []
  }

  if (!res.ok) return []
  return body.prints ?? []
}

export { neuronCardPageUrl }
