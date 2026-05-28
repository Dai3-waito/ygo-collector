import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

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
console.log('URL:', env.VITE_SUPABASE_URL ? '設定あり' : 'なし')
console.log('KEY:', env.VITE_SUPABASE_ANON_KEY ? `${env.VITE_SUPABASE_ANON_KEY.slice(0, 20)}...` : 'なし')

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const { data, error, count } = await supabase
  .from('user_cards')
  .select('*', { count: 'exact' })

if (error) {
  console.error('読込エラー:', error.message)
  console.error('hint:', error.hint)
  console.error('code:', error.code)
  process.exit(1)
}

console.log('件数:', count ?? data?.length ?? 0)
if (data?.length) {
  console.log('先頭1件:', data[0])
} else {
  console.log('データは0件です')
}
