import pg from 'pg'
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

const arg = process.argv[2] || process.env.SUPABASE_DB_PASSWORD
if (!arg) {
  console.error('Usage: node scripts/run-migration-folder.mjs <database-password> [project-ref]')
  process.exit(1)
}

const env = loadEnv()
const urlMatch = env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)
const envRef = urlMatch?.[1]
const projectRef = process.argv[3] || envRef

// 第2引数が20文字の英数字のみ → プロジェクトIDの可能性（パスワードは別途 .env の SUPABASE_DB_PASSWORD）
const looksLikeRef = /^[a-z]{20}$/.test(arg)
const password = looksLikeRef ? process.env.SUPABASE_DB_PASSWORD : arg
const refs = [...new Set([projectRef, envRef, looksLikeRef ? arg : null].filter(Boolean))]

if (!password) {
  console.error('Database password required. Set SUPABASE_DB_PASSWORD in .env or pass as first argument.')
  console.error('If you sent a project ref only, also provide the DB password from Supabase → Settings → Database')
  process.exit(1)
}

const connectionCandidates = []
for (const ref of refs) {
  connectionCandidates.push(
    `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`,
    `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  )
}

const sql = readFileSync(join(root, 'supabase', 'migration-folder.sql'), 'utf8')

for (const connectionString of connectionCandidates) {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    await client.query(sql)
    const check = await client.query(
      "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'user_cards' and column_name = 'folder'",
    )
    const matchedRef = connectionString.match(/db\.([^.]+)\.supabase/)?.[1]
    console.log('Migration OK on project:', matchedRef ?? 'unknown')
    console.log('folder column exists:', check.rowCount > 0)
    await client.end()
    process.exit(0)
  } catch (error) {
    try {
      await client.end()
    } catch {
      // ignore
    }
    console.error('Try failed:', error.message)
  }
}

console.error('All connection attempts failed.')
process.exit(1)
