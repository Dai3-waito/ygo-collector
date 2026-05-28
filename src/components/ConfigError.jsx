export default function ConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-8 text-zinc-100">
      <div className="max-w-lg rounded-2xl border border-amber-300/30 bg-zinc-900 p-6">
        <h1 className="text-xl font-bold text-amber-100">Supabase の設定が必要です</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          本番ビルド時に環境変数が入っていないため、アプリを起動できません。
          Vercel で次の2つを設定し、<strong className="text-amber-200">Redeploy</strong>{' '}
          してください。
        </p>
        <ul className="mt-4 space-y-2 rounded-lg bg-zinc-950/80 p-4 font-mono text-xs text-amber-100/90">
          <li>VITE_SUPABASE_URL</li>
          <li>VITE_SUPABASE_ANON_KEY</li>
        </ul>
        <p className="mt-4 text-xs text-zinc-400">
          値は Supabase → Project Settings → API の Project URL と anon public キーです。
          ローカルの .env と同じ内容を入れてください。
        </p>
      </div>
    </div>
  )
}
