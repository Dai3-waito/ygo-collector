import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function ProfileModal({ session, onClose }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const user = session?.user
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('ja-JP')
    : '—'

  async function handleChangePassword(e) {
    e.preventDefault()
    if (newPassword.length < 6) {
      setMessage('パスワードは6文字以上にしてください')
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage('パスワードが一致しません')
      return
    }

    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('パスワードを変更しました')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-amber-300/30 bg-zinc-900 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-amber-100">プロフィール</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-600 px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            閉じる
          </button>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="text-zinc-500">メールアドレス</dt>
            <dd className="text-zinc-100">{user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">登録日</dt>
            <dd className="text-zinc-100">{createdAt}</dd>
          </div>
        </dl>

        <form onSubmit={handleChangePassword} className="mt-6 space-y-3 border-t border-amber-300/20 pt-4">
          <p className="text-xs font-medium text-amber-200">パスワード変更</p>
          <input
            type="password"
            minLength={6}
            placeholder="新しいパスワード"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-300"
          />
          <input
            type="password"
            minLength={6}
            placeholder="新しいパスワード（確認）"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-300"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-amber-300/40 bg-amber-300/15 py-2 text-sm text-amber-100 disabled:opacity-50"
          >
            {loading ? '変更中...' : 'パスワードを変更'}
          </button>
        </form>

        {message ? <p className="mt-3 text-xs text-amber-200/90">{message}</p> : null}
      </div>
    </div>
  )
}
