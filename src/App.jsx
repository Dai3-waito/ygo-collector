import { useEffect, useRef, useState } from 'react'
import { cards } from './data/cards.js'
import { packTotals } from './data/packTotals.js'

const CUSTOM_IMAGES_STORAGE_KEY = 'ygo-custom-images-v1'

function kataToHira(input) {
  return Array.from(input, (ch) => {
    const code = ch.charCodeAt(0)
    // ァ(0x30A1) 〜 ヶ(0x30F6) を ぁ(0x3041) 〜 け(0x3096) に寄せる
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

function App() {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('owned')
  const [brokenImages, setBrokenImages] = useState({})
  const [customImages, setCustomImages] = useState({})
  const [targetCardId, setTargetCardId] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const fileInputRef = useRef(null)

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
  const hasCustomImages = Object.keys(customImages).length > 0

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_IMAGES_STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed === 'object') {
        setCustomImages(parsed)
      }
    } catch {
      // ignore invalid localStorage content
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_IMAGES_STORAGE_KEY, JSON.stringify(customImages))
      if (Object.keys(customImages).length > 0) {
        setSaveMessage('画像をローカル保存しました')
      }
    } catch {
      setSaveMessage('保存容量が不足しています')
    }
  }, [customImages])

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
    }
    reader.readAsDataURL(file)
  }

  const removeCardImage = (cardId) => {
    setCustomImages((prev) => {
      if (!prev[cardId]) return prev
      const next = { ...prev }
      delete next[cardId]
      return next
    })
    setBrokenImages((prev) => ({ ...prev, [cardId]: false }))
    setSaveMessage('このカード画像を削除しました')
  }

  const resetAllImages = () => {
    setCustomImages({})
    setBrokenImages({})
    setSaveMessage('全画像をリセットしました')
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,#262626_0%,#0a0a0a_45%,#030303_100%)] text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <header className="mb-6 rounded-2xl border border-amber-300/25 bg-zinc-900/70 p-5 shadow-[0_16px_60px_rgba(0,0,0,0.6)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">YGO Collection Library</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-amber-100 md:text-3xl">コレクション一覧</h1>
              <p className="mt-1 text-sm text-zinc-300">
                Steamライブラリ風カードビュー（カード画像 / レアリティ / コンプリート率 / 所持数）
              </p>
            </div>
            <div className="rounded-xl border border-amber-300/30 bg-zinc-950/70 px-4 py-2 text-right">
              <p className="text-xs text-zinc-400">全体コンプリート率</p>
              <p className="text-2xl font-bold text-amber-200">{overallRate}%</p>
              <p className="text-xs text-zinc-400">
                {overallOwnedKinds}/{overallOfficialTotal}
              </p>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            id="card-search"
            type="text"
            placeholder="カード名・パック名・型番で検索（例: うらら LEDE）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-amber-300/30 bg-zinc-900/80 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-amber-300/30 bg-zinc-900/80 px-3 py-3 text-sm text-zinc-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/25"
          >
            <option value="owned">所持数順</option>
            <option value="completion">コンプ率順</option>
            <option value="name">名前順</option>
          </select>
        </section>
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={resetAllImages}
            disabled={!hasCustomImages}
            className="rounded-lg border border-rose-300/35 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-100 transition enabled:hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            全画像リセット
          </button>
        </div>
        {saveMessage ? (
          <p className="mb-4 text-xs text-amber-200/90">{saveMessage}</p>
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
            <p className="text-zinc-300">該当するカードが見つかりませんでした。</p>
          </section>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedCards.map((card) => {
              const completion = packCompletionMap[card.pack] ?? { rate: 0, ownedKinds: 0, officialTotal: 0 }
              const imageSrc = customImages[card.id] || card.imageUrl
              const showImage = imageSrc && !brokenImages[card.id]
              return (
                <article
                  key={card.id}
                  className="group overflow-hidden rounded-2xl border border-amber-300/20 bg-zinc-900/75 shadow-[0_12px_40px_rgba(0,0,0,0.55)] transition hover:-translate-y-1 hover:border-amber-300/45"
                >
                  <button
                    type="button"
                    onClick={() => openImagePicker(card.id)}
                    className="relative h-48 w-full overflow-hidden text-left"
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${getRarityTheme(card.rarity)}`}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.2),transparent_45%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_80%,rgba(251,191,36,0.2),transparent_40%)]" />
                    {showImage ? (
                      <img
                        src={imageSrc}
                        alt={card.name}
                        loading="lazy"
                        onError={() => {
                          setBrokenImages((prev) => ({ ...prev, [card.id]: true }))
                        }}
                        className="absolute inset-0 h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="absolute left-3 top-3 rounded-md border border-amber-200/30 bg-zinc-950/50 px-2 py-1 text-[10px] tracking-widest text-amber-100/90">
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
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openImagePicker(card.id)}
                        className="rounded-lg border border-amber-300/30 bg-zinc-950/55 px-2 py-1.5 text-xs text-amber-100 transition hover:bg-zinc-900"
                      >
                        画像を保存
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCardImage(card.id)}
                        disabled={!customImages[card.id]}
                        className="rounded-lg border border-rose-300/35 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-100 transition enabled:hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        この画像を削除
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate rounded-full border border-amber-300/35 bg-amber-200/10 px-2.5 py-1 text-xs text-amber-200">
                        {card.rarity}
                      </span>
                      <span className="rounded-full border border-zinc-700 bg-zinc-950/50 px-2.5 py-1 text-xs text-zinc-300">
                        {card.collectionType}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-zinc-950/60 p-2">
                        <p className="text-zinc-400">コンプリート率</p>
                        <p className="text-base font-bold text-amber-200">{completion.rate}%</p>
                      </div>
                      <div className="rounded-lg bg-zinc-950/60 p-2">
                        <p className="text-zinc-400">所持数</p>
                        <p className="text-base font-bold text-zinc-100">{card.owned}</p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="truncate">{card.pack}</span>
                        <span>
                          {completion.ownedKinds}/{completion.officialTotal}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300"
                          style={{ width: `${completion.rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </div>
  )
}

export default App
