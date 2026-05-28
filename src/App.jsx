import { useEffect, useRef, useState } from 'react'
import AuthPanel from './components/AuthPanel.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import ResetPasswordPanel from './components/ResetPasswordPanel.jsx'
import {
  deleteUserCard,
  fetchUserCards,
  seedUserCards,
  upsertUserCard,
} from './lib/cardsApi.js'
import { packTotals } from './data/packTotals.js'
import { supabase } from './lib/supabase.js'

function kataToHira(input) {
  return Array.from(input, (ch) => {
    const code = ch.charCodeAt(0)
    if (code >= 0x30a1 && code <= 0x30f6) return String.fromCharCode(code - 0x60)
    return ch
  }).join('')
}

function normalizeForSearch(input) {
  return kataToHira(String(input ?? ''))
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[-－ー・/]/g, ' ')
    .replace(/\s+/g, ' ')
}

function getRarityTheme(rarity) {
  if (rarity.includes('25th') || rarity.includes('プリズマ')) {
    return 'from-fuchsia-500/30 via-amber-300/20 to-cyan-400/25'
  }
  if (rarity.includes('シークレット')) {
    return 'from-indigo-500/30 via-zinc-500/20 to-amber-400/25'
  }
  if (rarity.includes('ウルトラ')) {
    return 'from-yellow-500/35 via-amber-400/25 to-orange-500/30'
  }
  if (rarity.includes('スーパー')) {
    return 'from-sky-500/30 via-zinc-500/20 to-violet-500/25'
  }
  return 'from-zinc-600/35 via-zinc-500/20 to-zinc-700/30'
}

const emptyNewCard = {
  id: '',
  name: '',
  pack: '',
  rarity: 'シークレットレア',
  imageUrl: '',
  owned: 1,
  location: '',
  collectionType: '初版',
}

function App() {
  const [session, setSession] = useState(null)
  const [cards, setCards] = useState([])
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('owned')
  const [brokenImages, setBrokenImages] = useState({})
  const [customImages, setCustomImages] = useState({})
  const [targetCardId, setTargetCardId] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCard, setNewCard] = useState(emptyNewCard)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const fileInputRef = useRef(null)

  const userId = session?.user?.id
  const imagesStorageKey = userId ? `ygo-custom-images-${userId}` : 'ygo-custom-images-guest'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setRecoveryMode(event === 'PASSWORD_RECOVERY')
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) {
      setCards([])
      return
    }
    loadUserCards(userId)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    try {
      const saved = localStorage.getItem(imagesStorageKey)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed === 'object') setCustomImages(parsed)
    } catch {
      // ignore
    }
  }, [userId, imagesStorageKey])

  useEffect(() => {
    if (!userId) return
    try {
      localStorage.setItem(imagesStorageKey, JSON.stringify(customImages))
    } catch {
      setSaveMessage('保存容量が不足しています')
    }
  }, [customImages, userId, imagesStorageKey])

  async function loadUserCards(uid) {
    setIsLoading(true)
    setSaveMessage('')
    try {
      let list = await fetchUserCards(uid)
      if (list.length === 0) {
        list = await seedUserCards(uid)
        setSaveMessage('初回ログイン: サンプルカードを登録しました')
      } else {
        setSaveMessage(`${list.length} 件のカードを読み込みました`)
      }
      setCards(list)
    } catch (error) {
      setSaveMessage(`読込エラー: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  async function saveCard(card) {
    if (!userId) return false
    setIsSaving(true)
    try {
      await upsertUserCard(card, userId)
      setSaveMessage(`${card.name} を保存しました`)
      return true
    } catch (error) {
      setSaveMessage(`保存エラー: ${error.message}`)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function changeOwned(cardId, delta) {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return
    const updated = { ...card, owned: Math.max(0, card.owned + delta) }
    setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)))
    await saveCard(updated)
  }

  async function updateLocation(cardId, location) {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return
    const updated = { ...card, location }
    setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)))
    await saveCard(updated)
  }

  async function handleAddCard(e) {
    e.preventDefault()
    if (!userId) return
    if (!newCard.id.trim() || !newCard.name.trim()) {
      setSaveMessage('型番とカード名は必須です')
      return
    }
    if (cards.some((c) => c.id === newCard.id.trim())) {
      setSaveMessage('同じ型番のカードが既にあります')
      return
    }

    const card = {
      ...newCard,
      id: newCard.id.trim(),
      name: newCard.name.trim(),
      imageUrl: newCard.imageUrl.trim() || `/cards/${newCard.id.trim()}.jpg`,
      owned: Number(newCard.owned) || 0,
    }

    setIsSaving(true)
    try {
      await upsertUserCard(card, userId)
      setCards((prev) => [...prev, card])
      setNewCard(emptyNewCard)
      setShowAddForm(false)
      setSaveMessage(`${card.name} を追加しました`)
    } catch (error) {
      setSaveMessage(`追加エラー: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  async function confirmDeleteCard() {
    if (!userId || !deleteTarget) return

    const card = deleteTarget
    setIsSaving(true)
    try {
      await deleteUserCard(userId, card.id)
      setCards((prev) => prev.filter((c) => c.id !== card.id))
      setSaveMessage(`${card.name} を削除しました`)
      setDeleteTarget(null)
    } catch (error) {
      setSaveMessage(`削除エラー: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setCards([])
    setCustomImages({})
    setSaveMessage('ログアウトしました')
  }

  const openImagePicker = (cardId) => {
    setTargetCardId(cardId)
    fileInputRef.current?.click()
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file || !targetCardId) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) return
      setCustomImages((prev) => ({ ...prev, [targetCardId]: dataUrl }))
      setBrokenImages((prev) => ({ ...prev, [targetCardId]: false }))
      event.target.value = ''
      setSaveMessage('画像を端末に保存しました（カードデータとは別）')
    }
    reader.readAsDataURL(file)
  }

  const normalizedQuery = normalizeForSearch(query)
  const queryTokens = normalizedQuery ? normalizedQuery.split(' ').filter(Boolean) : []

  const ownedByPack = cards.reduce((acc, card) => {
    if (!acc[card.pack]) acc[card.pack] = 0
    if (card.owned > 0) acc[card.pack] += 1
    return acc
  }, {})

  const packCompletionMap = Object.fromEntries(
    Object.entries(packTotals).map(([pack, officialTotal]) => {
      const ownedKinds = ownedByPack[pack] ?? 0
      const rate = officialTotal === 0 ? 0 : Math.round((ownedKinds / officialTotal) * 100)
      return [pack, { rate, ownedKinds, officialTotal }]
    }),
  )

  const filteredCards = cards.filter((card) => {
    if (queryTokens.length === 0) return true
    const haystack = normalizeForSearch([card.name, card.pack, card.id].join(' '))
    return queryTokens.every((token) => haystack.includes(token))
  })

  const sortedCards = [...filteredCards].sort((a, b) => {
    const aCompletion = packCompletionMap[a.pack]?.rate ?? 0
    const bCompletion = packCompletionMap[b.pack]?.rate ?? 0
    if (sortBy === 'owned') return b.owned - a.owned
    if (sortBy === 'completion') return bCompletion - aCompletion
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'ja')
    return 0
  })

  const overallOwnedKinds = Object.values(packCompletionMap).reduce(
    (sum, item) => sum + item.ownedKinds,
    0,
  )
  const overallOfficialTotal = Object.values(packCompletionMap).reduce(
    (sum, item) => sum + item.officialTotal,
    0,
  )
  const overallRate =
    overallOfficialTotal === 0 ? 0 : Math.round((overallOwnedKinds / overallOfficialTotal) * 100)

  if (recoveryMode && session) {
    return (
      <ResetPasswordPanel
        onDone={() => {
          setRecoveryMode(false)
          window.history.replaceState({}, '', window.location.pathname)
        }}
      />
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_0%,#262626_0%,#0a0a0a_45%,#030303_100%)] px-4 py-8 text-zinc-100">
        <AuthPanel onAuth={setSession} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,#262626_0%,#0a0a0a_45%,#030303_100%)] text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <header className="mb-6 rounded-2xl border border-amber-300/25 bg-zinc-900/70 p-5 shadow-[0_16px_60px_rgba(0,0,0,0.6)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">
                YGO Collection Library
              </p>
              <h1 className="mt-2 text-2xl font-bold text-amber-100 md:text-3xl">コレクション一覧</h1>
              <p className="mt-1 text-sm text-zinc-400">{session.user.email}</p>
              {isLoading ? (
                <p className="mt-2 text-xs text-amber-300/80">読込中...</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-amber-300/30 bg-zinc-950/70 px-4 py-2 text-right">
                <p className="text-xs text-zinc-400">全体コンプリート率</p>
                <p className="text-2xl font-bold text-amber-200">{overallRate}%</p>
              </div>
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                className="rounded-lg border border-amber-300/30 px-3 py-2 text-xs text-amber-100 hover:bg-amber-300/10"
              >
                プロフィール
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-zinc-600 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>

        <section className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-sm text-amber-100 hover:bg-amber-300/20"
          >
            {showAddForm ? '追加フォームを閉じる' : '＋ カードを追加'}
          </button>
        </section>

        {showAddForm ? (
          <form
            onSubmit={handleAddCard}
            className="mb-6 grid gap-3 rounded-2xl border border-amber-300/20 bg-zinc-900/70 p-4 md:grid-cols-2"
          >
            <input
              placeholder="型番（例: QCCU-JP099）"
              value={newCard.id}
              onChange={(e) => setNewCard({ ...newCard, id: e.target.value })}
              className="rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="カード名"
              value={newCard.name}
              onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
              className="rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="パック名"
              value={newCard.pack}
              onChange={(e) => setNewCard({ ...newCard, pack: e.target.value })}
              className="rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm"
            />
            <input
              placeholder="レアリティ"
              value={newCard.rarity}
              onChange={(e) => setNewCard({ ...newCard, rarity: e.target.value })}
              className="rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm"
            />
            <input
              placeholder="収納場所"
              value={newCard.location}
              onChange={(e) => setNewCard({ ...newCard, location: e.target.value })}
              className="rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm"
            />
            <select
              value={newCard.collectionType}
              onChange={(e) => setNewCard({ ...newCard, collectionType: e.target.value })}
              className="rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm"
            >
              <option value="初版">初版</option>
              <option value="再録">再録</option>
              <option value="25th">25th</option>
            </select>
            <input
              type="number"
              min={0}
              placeholder="所持数"
              value={newCard.owned}
              onChange={(e) => setNewCard({ ...newCard, owned: Number(e.target.value) })}
              className="rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg border border-amber-300/40 bg-amber-300/15 py-2 text-sm text-amber-100 md:col-span-2"
            >
              カードを追加して保存
            </button>
          </form>
        ) : null}

        <section className="mb-6 grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            type="text"
            placeholder="カード名・パック名・型番で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-amber-300/30 bg-zinc-900/80 px-4 py-3 text-zinc-100 outline-none focus:border-amber-300"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-amber-300/30 bg-zinc-900/80 px-3 py-3 text-sm"
          >
            <option value="owned">所持数順</option>
            <option value="completion">コンプ率順</option>
            <option value="name">名前順</option>
          </select>
        </section>

        {saveMessage || isSaving ? (
          <p className="mb-4 text-xs text-amber-200/90">
            {isSaving ? '保存中...' : saveMessage}
          </p>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />

        {sortedCards.length === 0 ? (
          <section className="rounded-2xl border border-amber-300/20 bg-zinc-900/60 p-10 text-center">
            <p className="text-zinc-300">カードがありません。「＋ カードを追加」から登録してください。</p>
          </section>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedCards.map((card) => {
              const completion =
                packCompletionMap[card.pack] ?? { rate: 0, ownedKinds: 0, officialTotal: 0 }
              const imageSrc = customImages[card.id] || card.imageUrl
              const showImage = imageSrc && !brokenImages[card.id]
              return (
                <article
                  key={card.id}
                  className="overflow-hidden rounded-2xl border border-amber-300/20 bg-zinc-900/75 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
                >
                  <button
                    type="button"
                    onClick={() => openImagePicker(card.id)}
                    className="relative h-48 w-full overflow-hidden text-left"
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${getRarityTheme(card.rarity)}`}
                    />
                    {showImage ? (
                      <img
                        src={imageSrc}
                        alt={card.name}
                        loading="lazy"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [card.id]: true }))
                        }
                        className="absolute inset-0 h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="absolute left-3 top-3 rounded-md border border-amber-200/30 bg-zinc-950/50 px-2 py-1 text-[10px] text-amber-100/90">
                        ADD IMAGE
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/35 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-amber-300/25 bg-zinc-950/65 p-2 backdrop-blur-sm">
                      <p className="truncate text-sm font-semibold text-amber-100">{card.name}</p>
                      <p className="truncate text-[11px] text-zinc-400">{card.id}</p>
                    </div>
                  </button>

                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate rounded-full border border-amber-300/35 bg-amber-200/10 px-2.5 py-1 text-xs text-amber-200">
                        {card.rarity}
                      </span>
                      <span className="rounded-full border border-zinc-700 bg-zinc-950/50 px-2.5 py-1 text-xs text-zinc-300">
                        {card.collectionType}
                      </span>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] text-zinc-400">収納場所</label>
                      <input
                        type="text"
                        value={card.location}
                        onChange={(e) =>
                          setCards((prev) =>
                            prev.map((c) =>
                              c.id === card.id ? { ...c, location: e.target.value } : c,
                            ),
                          )
                        }
                        onBlur={(e) => updateLocation(card.id, e.target.value)}
                        className="w-full rounded-lg border border-amber-300/25 bg-zinc-950/60 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-amber-300"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-zinc-950/60 p-2">
                        <p className="text-zinc-400">コンプ率</p>
                        <p className="text-base font-bold text-amber-200">{completion.rate}%</p>
                      </div>
                      <div className="rounded-lg bg-zinc-950/60 p-2">
                        <p className="mb-1 text-zinc-400">所持数</p>
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => changeOwned(card.id, -1)}
                            disabled={card.owned <= 0 || isSaving}
                            className="rounded border border-zinc-600 px-2 py-0.5 text-sm disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="font-bold text-zinc-100">{card.owned}</span>
                          <button
                            type="button"
                            onClick={() => changeOwned(card.id, 1)}
                            disabled={isSaving}
                            className="rounded border border-amber-300/40 px-2 py-0.5 text-sm text-amber-100"
                          >
                            ＋
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(card)}
                      disabled={isSaving}
                      className="w-full rounded-lg border border-rose-300/35 bg-rose-500/10 py-1.5 text-xs text-rose-100 hover:bg-rose-500/20 disabled:opacity-40"
                    >
                      このカードを削除
                    </button>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>

      {showProfile ? (
        <ProfileModal session={session} onClose={() => setShowProfile(false)} />
      ) : null}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-300/30 bg-zinc-900 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <h2 id="delete-dialog-title" className="text-lg font-bold text-amber-100">
              カードを削除しますか？
            </h2>
            <p className="mt-3 text-sm text-zinc-300">
              「<span className="font-medium text-zinc-100">{deleteTarget.name}</span>」
              （{deleteTarget.id}）をコレクションから削除します。
            </p>
            <p className="mt-2 text-xs text-zinc-500">この操作は元に戻せません。</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isSaving}
                className="flex-1 rounded-lg border border-zinc-600 py-2.5 text-sm text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmDeleteCard}
                disabled={isSaving}
                className="flex-1 rounded-lg border border-rose-400/50 bg-rose-500/20 py-2.5 text-sm font-medium text-rose-100 transition hover:bg-rose-500/30 disabled:opacity-50"
              >
                {isSaving ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
