import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadEnv() {
  const envPath = join(root, '.env')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
  }
  return env
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('.env に VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY がありません')
  process.exit(1)
}

const cardsModuleUrl = pathToFileURL(join(root, 'src/data/cards.js')).href
const { cards } = await import(cardsModuleUrl)
const supabase = createClient(url, key)

const rows = cards.map((card) => ({
  card_id: card.id,
  owned: card.owned,
  location: card.location,
  collection_type: card.collectionType,
}))

const { data, error } = await supabase
  .from('user_cards')
  .upsert(rows, { onConflict: 'card_id' })
  .select()

if (error) {
  console.error('登録失敗:', error.message)
  process.exit(1)
}

console.log(`OK: ${data?.length ?? rows.length} 件を user_cards に登録しました`)
console.log('例: QCCU-JP001 owned =', rows.find((r) => r.card_id === 'QCCU-JP001')?.owned)
