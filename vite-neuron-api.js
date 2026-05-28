import {
  neuronPackPageUrl,
  parseNeuronPackList,
  parseNeuronPackTotal,
} from './src/lib/neuronParse.js'
import { aggregateSetRarities } from './src/lib/prodeckSetRarities.js'
import { parseNeuronPackRarities } from './src/lib/neuronParse.js'

const NEURON_LIST_URL =
  'https://www.db.yugioh-card.com/yugiohdb/card_list.action?wname=CardSearch&clm=1&request_locale=ja'

/** 開発時: /api/ygo-neuron-* を Vercel なしで動かす */
export function neuronApiDevPlugin() {
  return {
    name: 'neuron-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''

        if (url.startsWith('/api/ygo-neuron-list')) {
          try {
            const upstream = await fetch(NEURON_LIST_URL, {
              headers: { 'User-Agent': 'ygo-collector/1.0' },
            })
            const html = await upstream.text()
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.statusCode = upstream.ok ? 200 : upstream.status
            res.end(JSON.stringify({ packs: parseNeuronPackList(html) }))
          } catch {
            res.statusCode = 502
            res.end(JSON.stringify({ error: 'Upstream request failed', packs: [] }))
          }
          return
        }

        if (url.startsWith('/api/ygo-neuron-pack-rarities')) {
          const pid = new URL(url, 'http://local').searchParams.get('pid')
          if (!pid) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'pid is required' }))
            return
          }
          try {
            const packUrl = neuronPackPageUrl(pid)
            const upstream = await fetch(packUrl, {
              headers: { 'User-Agent': 'ygo-collector/1.0' },
            })
            const html = await upstream.text()
            const counts = parseNeuronPackRarities(html)
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            if (!counts) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'Rarity breakdown not found', pid }))
              return
            }
            res.statusCode = 200
            res.end(
              JSON.stringify({
                pid,
                url: packUrl,
                rarities: Object.fromEntries(counts),
              }),
            )
          } catch {
            res.statusCode = 502
            res.end(JSON.stringify({ error: 'Upstream request failed' }))
          }
          return
        }

        if (url.startsWith('/api/ygo-set-rarities')) {
          const params = new URL(url, 'http://local').searchParams
          const setcode = params.get('setcode') ?? ''
          const setname = params.get('setname') ?? ''
          try {
            const result = await aggregateSetRarities(setcode, setname || null)
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            if (!result) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'No cards found for set', setcode }))
              return
            }
            res.statusCode = 200
            res.end(
              JSON.stringify({
                setcode: setcode.toUpperCase(),
                setName: result.setName,
                total: result.total,
                rarities: Object.fromEntries(result.counts),
              }),
            )
          } catch {
            res.statusCode = 502
            res.end(JSON.stringify({ error: 'Upstream request failed' }))
          }
          return
        }

        if (url.startsWith('/api/ygo-neuron-pack')) {
          const pid = new URL(url, 'http://local').searchParams.get('pid')
          if (!pid) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'pid is required' }))
            return
          }
          try {
            const packUrl = neuronPackPageUrl(pid)
            const upstream = await fetch(packUrl, {
              headers: { 'User-Agent': 'ygo-collector/1.0' },
            })
            const html = await upstream.text()
            const total = parseNeuronPackTotal(html)
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.statusCode = 200
            res.end(
              JSON.stringify({
                pid,
                total: total != null && total > 0 ? total : null,
                url: packUrl,
              }),
            )
          } catch {
            res.statusCode = 502
            res.end(JSON.stringify({ error: 'Upstream request failed' }))
          }
          return
        }

        next()
      })
    },
  }
}
