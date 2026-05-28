import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function AuthPanel({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      })
      setLoading(false)
      if (error) {
        setMessage(error.message)
        return
      }
      setMessage('パスワード再設定メールを送信しました。メールを確認してください。')
      return
    }

    const action =
      mode === 'login'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password })

    const { data, error } = await action
    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    if (mode === 'signup' && !data.session) {
      setMessage('確認メールを送信しました。メール内のリンクから認証してください。')
      return
    }

    onAuth(data.session)
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-amber-300/25 bg-zinc-900/80 p-6 shadow-[0_16px_60px_rgba(0,0,0,0.6)]">
      <h1 className="text-xl font-bold text-amber-100">YGO Collector</h1>
      <p className="mt-1 text-sm text-zinc-400">ログインしてコレクションを管理</p>

      <div className="mt-4 inline-flex flex-wrap rounded-lg border border-amber-300/30 bg-zinc-950/60 p-1">
        {[
          ['login', 'ログイン'],
          ['signup', '新規登録'],
          ['forgot', 'パスワード忘れ'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMode(key)
              setMessage('')
            }}
            className={`rounded-md px-3 py-1.5 text-xs ${
              mode === key ? 'bg-amber-300/20 text-amber-100' : 'text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="email"
          required
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-300"
        />
        {mode !== 'forgot' ? (
          <input
            type="password"
            required
            minLength={6}
            placeholder="パスワード（6文字以上）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-300"
          />
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg border border-amber-300/40 bg-amber-300/15 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-300/25 disabled:opacity-50"
        >
          {loading
            ? '処理中...'
            : mode === 'login'
              ? 'ログイン'
              : mode === 'signup'
                ? 'アカウント作成'
                : '再設定メールを送信'}
        </button>
      </form>

      {message ? <p className="mt-3 text-xs text-amber-200/90">{message}</p> : null}
    </div>
  )
}
