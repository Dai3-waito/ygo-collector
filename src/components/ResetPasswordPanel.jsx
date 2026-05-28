import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function ResetPasswordPanel({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 6) {
      setMessage('パスワードは6文字以上にしてください')
      return
    }
    if (password !== confirm) {
      setMessage('パスワードが一致しません')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('パスワードを再設定しました。ログインを続けます。')
    setTimeout(onDone, 1500)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_0%,#262626_0%,#0a0a0a_45%,#030303_100%)] px-4 py-8 text-zinc-100">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-amber-300/25 bg-zinc-900/80 p-6">
        <h1 className="text-xl font-bold text-amber-100">新しいパスワードを設定</h1>
        <p className="mt-1 text-sm text-zinc-400">メールのリンクから開いた画面です</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            type="password"
            minLength={6}
            required
            placeholder="新しいパスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm"
          />
          <input
            type="password"
            minLength={6}
            required
            placeholder="確認用"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-amber-300/40 bg-amber-300/15 py-2 text-sm text-amber-100"
          >
            {loading ? '保存中...' : 'パスワードを保存'}
          </button>
        </form>
        {message ? <p className="mt-3 text-xs text-amber-200/90">{message}</p> : null}
      </div>
    </div>
  )
}
