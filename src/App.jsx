import { useEffect, useMemo, useRef, useState } from 'react'
import AddCardForm from './components/AddCardForm.jsx'
import AuthPanel from './components/AuthPanel.jsx'
import FolderBar from './components/FolderBar.jsx'
import PackCompletionPanel from './components/PackCompletionPanel.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import ResetPasswordPanel from './components/ResetPasswordPanel.jsx'
import { deleteUserCard, fetchUserCards, upsertUserCard } from './lib/cardsApi.js'
import { getRarityTheme } from './lib/cardUi.jsx'
import { computePackCompletionList } from './lib/packCompletion.js'
import { loadOfficialPackData } from './lib/packOfficialApi.js'
import { resolveCanonicalPackName } from './lib/packTotalsStorage.js'
import { MAX_COLLECTION_SIZE } from './lib/constants.js'
import {
  addFolderName,
  DEFAULT_FOLDER,
  loadFolders,
  saveFolders,
} from './lib/foldersStorage.js'
import { normalizeForSearch } from './lib/searchUtils.js'
import { supabase } from './lib/supabase.js'

const TAB_STORAGE_KEY = 'ygo-active-tab'

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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [folders, setFolders] = useState([DEFAULT_FOLDER])
  const [activeFolder, setActiveFolder] = useState('all')
  const [activeTab, setActiveTab] = useState('collection')
  const [officialData, setOfficialData] = useState(null)
  const [isLoadingOfficial, setIsLoadingOfficial] = useState(false)
  const [loadOfficialError, setLoadOfficialError] = useState('')
  const fileInputRef = useRef(null)

  const userId = session?.user?.id
  const imagesStorageKey = userId ? `ygo-custom-images-${userId}` : 'ygo-custom-images-guest'

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((error) => console.error('[auth] getSession failed', error))
      .finally(() => setAuthReady(true))

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setRecoveryMode(event === 'PASSWORD_RECOVERY')
      setAuthReady(true)
    })
    return () => listener?.subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) {
      setCards([])
      setFolders([DEFAULT_FOLDER])
      return
    }
    setFolders(loadFolders(userId))
    loadUserCards(userId)

    try {
      const savedTab = localStorage.getItem(`${TAB_STORAGE_KEY}-${userId}`)
      if (savedTab === 'collection' || savedTab === 'completion') setActiveTab(savedTab)
    } catch {
      // ignore
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setOfficialData(null)
      return
    }

    const controller = new AbortController()
    setIsLoadingOfficial(true)
    setLoadOfficialError('')

    loadOfficialPackData(cards, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setOfficialData(data)
          if (data.errors?.length) {
            setLoadOfficialError(data.errors.join(' / '))
          }
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        if (!controller.signal.aborted) {
          setOfficialData(null)
          setLoadOfficialError(error.message || '公式データの取得に失敗しました')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingOfficial(false)
      })

    return () => controller.abort()
  }, [userId, cards])

  useEffect(() => {
    if (!userId) return
    try {
      localStorage.setItem(`${TAB_STORAGE_KEY}-${userId}`, activeTab)
    } catch {
      // ignore
    }
  }, [activeTab, userId])

  function mergeFoldersFromCards(list, uid) {
    const fromCards = list.map((c) => c.folder).filter(Boolean)
    const merged = saveFolders(uid, [...loadFolders(uid), ...fromCards])
    setFolders(merged)
  }

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
      const list = await fetchUserCards(uid)
      setCards(list)
      setSaveMessage(
        list.length === 0
          ? 'コレクションは空です。「＋ カードを追加」から登録してください。'
          : `${list.length} 件のカードを読み込みました`,
      )
      mergeFoldersFromCards(list, uid)
    } catch (error) {
      setSaveMessage(`読込エラー: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  async function saveCard(card, { message } = {}) {
    if (!userId) return false
    setIsSaving(true)
    try {
      const meta = await upsertUserCard(card, userId)
      if (meta?.folderLocalOnly) {
        setSaveMessage(
          message ??
            '保存しました（フォルダはこの端末のみ。Supabase で migration-folder.sql を実行すると同期されます）',
        )
      } else {
        setSaveMessage(message ?? `${card.name} を保存しました`)
      }
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

  async function updateFolder(cardId, folder) {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return
    const nextFolder = folder.trim() || DEFAULT_FOLDER
    const updated = { ...card, folder: nextFolder }
    setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)))
    if (userId) {
      const merged = saveFolders(userId, [...folders, nextFolder])
      setFolders(merged)
    }
    await saveCard(updated, { message: 'フォルダを更新しました' })
  }

  function handleAddFolder(name) {
    if (!userId) return
    const merged = addFolderName(userId, name)
    setFolders(merged)
    setSaveMessage(`フォルダ「${name}」を作成しました`)
  }

  async function handleAddCard(card) {
    if (!userId) return
    if (cards.length >= MAX_COLLECTION_SIZE) {
      setSaveMessage(`コレクション上限（${MAX_COLLECTION_SIZE}件）に達しています`)
      return
    }
    if (cards.some((c) => c.id === card.id)) {
      setSaveMessage('この収録（型番）は既にコレクションにあります')
      return
    }

    setIsSaving(true)
    try {
      const meta = await upsertUserCard(card, userId)
      setCards((prev) => [...prev, card])
      setShowAddForm(false)
      if (meta?.folderLocalOnly) {
        setSaveMessage(
          `${card.name} を追加しました（フォルダは端末のみ保存。Supabase で migration-folder.sql を実行してください）`,
        )
      } else {
        setSaveMessage(`${card.name} を追加しました`)
      }
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

  const packCompletionList = useMemo(
    () => computePackCompletionList(cards, officialData),
    [cards, officialData],
  )

  const packCompletionMap = useMemo(
    () =>
      Object.fromEntries(
        packCompletionList.map(
          ({ pack, rate, ownedKinds, officialTotal, usesOfficialDenominator }) => [
            pack,
            { rate, ownedKinds, officialTotal, usesOfficialDenominator },
          ],
        ),
      ),
    [packCompletionList],
  )

  const folderFilteredCards = useMemo(() => {
    if (activeFolder === 'all') return cards
    return cards.filter((c) => (c.folder || DEFAULT_FOLDER) === activeFolder)
  }, [cards, activeFolder])

  const folderCounts = useMemo(() => {
    const counts = { all: cards.length }
    for (const card of cards) {
      const key = card.folder || DEFAULT_FOLDER
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [cards])

  const filteredCards = folderFilteredCards.filter((card) => {
    if (queryTokens.length === 0) return true
    const haystack = normalizeForSearch([card.name, card.pack, card.id, card.folder].join(' '))
    return queryTokens.every((token) => haystack.includes(token))
  })

  const sortedCards = [...filteredCards].sort((a, b) => {
    const aCompletion = packCompletionMap[resolveCanonicalPackName(a.pack)]?.rate ?? 0
    const bCompletion = packCompletionMap[resolveCanonicalPackName(b.pack)]?.rate ?? 0
    if (sortBy === 'owned') return b.owned - a.owned
    if (sortBy === 'completion') return bCompletion - aCompletion
    if (sortBy === 'name') return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ja')
    return 0
  })

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">
        <p className="text-sm">読込中...</p>
      </div>
    )
  }

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
              <h1 className="mt-2 text-2xl font-bold text-amber-100 md:text-3xl">
                {activeTab === 'completion' ? 'コレクション率' : 'コレクション一覧'}
              </h1>
              <p className="mt-1 text-sm text-zinc-400">{session.user.email}</p>
              {isLoading ? (
                <p className="mt-2 text-xs text-amber-300/80">読込中...</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
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

          <nav className="mt-4 flex gap-2 border-t border-amber-300/15 pt-4">
            <button
              type="button"
              onClick={() => setActiveTab('collection')}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                activeTab === 'collection'
                  ? 'border border-amber-300/50 bg-amber-300/15 text-amber-100'
                  : 'border border-transparent text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
              }`}
            >
              コレクション
              <span className="ml-2 text-xs text-zinc-500">{cards.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completion')}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                activeTab === 'completion'
                  ? 'border border-amber-300/50 bg-amber-300/15 text-amber-100'
                  : 'border border-transparent text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
              }`}
            >
              コレクション率
              {packCompletionList.length > 0 ? (
                <span className="ml-2 text-xs text-zinc-500">
                  {packCompletionList.length} パック
                </span>
              ) : null}
            </button>
          </nav>
        </header>

        {activeTab === 'completion' ? (
          <PackCompletionPanel
            cards={cards}
            officialData={officialData}
            isLoadingOfficial={isLoadingOfficial}
            loadOfficialError={loadOfficialError}
          />
        ) : (
          <>
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
              <AddCardForm
                ownedCards={cards}
                folders={folders}
                collectionCount={cards.length}
                onAdd={handleAddCard}
                isSaving={isSaving}
              />
            ) : null}

            <FolderBar
              folders={folders}
              activeFolder={activeFolder}
              onSelectFolder={setActiveFolder}
              onAddFolder={handleAddFolder}
              cardCounts={folderCounts}
            />

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
                packCompletionMap[resolveCanonicalPackName(card.pack)] ?? {
                  rate: null,
                  ownedKinds: 0,
                  officialTotal: null,
                  usesOfficialDenominator: false,
                }
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
                    {card.pack ? (
                      <div className="rounded-xl border border-amber-800/35 bg-[linear-gradient(135deg,#2a2218_0%,#141210_55%,#1a1614_100%)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,220,150,0.06)]">
                        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-amber-600/90">
                          収録パック
                        </p>
                        <p className="mt-0.5 text-sm font-semibold leading-snug text-amber-50">
                          {card.pack}
                        </p>
                      </div>
                    ) : null}

                    {card.rarity ? (
                      <span className="inline-block truncate rounded-full border border-amber-300/35 bg-amber-200/10 px-2.5 py-1 text-xs text-amber-200">
                        {card.rarity}
                      </span>
                    ) : null}

                    <div>
                      <label className="mb-1 block text-[11px] text-zinc-400">フォルダ</label>
                      <select
                        value={card.folder || DEFAULT_FOLDER}
                        onChange={(e) => updateFolder(card.id, e.target.value)}
                        disabled={isSaving}
                        className="w-full rounded-lg border border-amber-300/25 bg-zinc-950/60 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-amber-300"
                      >
                        {folders.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
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
                        <p className="text-base font-bold text-amber-200">
                          {completion.rate != null ? `${completion.rate}%` : '—'}
                        </p>
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
          </>
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
