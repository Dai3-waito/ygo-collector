import { useEffect, useMemo, useState } from 'react'
import {
  MAX_COLLECTION_SIZE,
  MAX_SEARCH_RESULTS,
  MIN_SEARCH_LENGTH,
} from '../lib/constants.js'
import { DEFAULT_FOLDER } from '../lib/foldersStorage.js'
import { cardImageUrl, searchYgoCardsJa } from '../lib/ygoCdb.js'

function catalogToNewCard(entry, folder) {
  return {
    id: entry.id,
    name: entry.name,
    pack: entry.pack,
    rarity: entry.rarity,
    imageUrl: entry.imageUrl || cardImageUrl(entry.passcode, 'full'),
    owned: 1,
    location: '',
    collectionType: '初版',
    folder: folder || DEFAULT_FOLDER,
  }
}

export default function AddCardForm({
  ownedCards,
  folders,
  collectionCount,
  onAdd,
  isSaving,
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [owned, setOwned] = useState(1)
  const [location, setLocation] = useState('')
  const [collectionType, setCollectionType] = useState('初版')
  const [folder, setFolder] = useState(DEFAULT_FOLDER)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const ownedIds = useMemo(() => new Set(ownedCards.map((c) => c.id)), [ownedCards])
  const atCollectionLimit = collectionCount >= MAX_COLLECTION_SIZE

  const displayResults = useMemo(
    () => results.filter((r) => !ownedIds.has(r.id)).slice(0, MAX_SEARCH_RESULTS),
    [results, ownedIds],
  )

  const selectedEntry = results.find((r) => r.id === selectedId)

  useEffect(() => {
    const q = search.trim()
    if (q.length < MIN_SEARCH_LENGTH) {
      setResults([])
      setSearchError('')
      setIsSearching(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setIsSearching(true)
      setSearchError('')
      try {
        const found = await searchYgoCardsJa(q, {
          maxResults: MAX_SEARCH_RESULTS,
          signal: controller.signal,
        })
        setResults(found)
        if (found.length === 0) {
          setSearchError('該当するカードが見つかりませんでした。別のキーワードで試してください。')
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        setResults([])
        setSearchError(error.message || '検索に失敗しました')
      } finally {
        if (!controller.signal.aborted) setIsSearching(false)
      }
    }, 400)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [search])

  function handleSelect(card) {
    setSelectedId(card.id)
    setOwned(1)
    setLocation('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!selectedEntry || atCollectionLimit) return
    onAdd({
      ...catalogToNewCard(selectedEntry, folder),
      owned: Number(owned) || 0,
      location: location.trim(),
      collectionType,
    })
  }

  if (atCollectionLimit) {
    return (
      <div className="mb-6 rounded-2xl border border-amber-300/20 bg-zinc-900/70 p-4 text-sm text-zinc-400">
        コレクション上限（{MAX_COLLECTION_SIZE}件）に達しています。不要なカードを削除してから追加してください。
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-2xl border border-amber-300/20 bg-zinc-900/70 p-4"
    >
      <p className="text-sm font-medium text-amber-100">カードを検索して追加</p>
      <p className="mt-1 text-xs text-zinc-400">
        日本語名・ルビ・効果文・パスワードで検索（最大{MAX_SEARCH_RESULTS}件）
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        登録数: {collectionCount} / {MAX_COLLECTION_SIZE}
      </p>

      <input
        type="text"
        placeholder="例: 青眼の白龍 / 灰流うらら / 89631139"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setSelectedId('')
        }}
        className="mt-3 w-full rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-300"
      />

      {isSearching ? (
        <p className="mt-2 text-xs text-amber-300/80">検索中...</p>
      ) : null}
      {searchError ? <p className="mt-2 text-xs text-rose-300/90">{searchError}</p> : null}

      {search.trim().length >= MIN_SEARCH_LENGTH ? (
        <p className="mt-2 text-xs text-zinc-400">
          {isSearching ? '…' : `${displayResults.length} 件表示`}
          {results.length > displayResults.length
            ? `（${results.length - displayResults.length} 件は登録済みのため非表示）`
            : ''}
        </p>
      ) : null}

      <div className="mt-3 max-h-[28rem] overflow-y-auto rounded-lg border border-zinc-700/80 bg-zinc-950/60 p-2">
        {search.trim().length < MIN_SEARCH_LENGTH ? (
          <p className="px-2 py-8 text-center text-xs text-zinc-500">
            カード名を入力すると、画像一覧が表示されます
          </p>
        ) : displayResults.length === 0 && !isSearching ? (
          <p className="px-2 py-8 text-center text-xs text-zinc-500">
            {results.length > 0
              ? '該当カードはすべてコレクションに登録済みです'
              : '表示できる結果がありません'}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {displayResults.map((card) => {
              const isSelected = card.id === selectedId
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleSelect(card)}
                  className={`group flex flex-col overflow-hidden rounded-lg border text-left transition ${
                    isSelected
                      ? 'border-amber-300/60 bg-amber-300/15 ring-2 ring-amber-300/50'
                      : 'border-zinc-700/80 bg-zinc-900/50 hover:border-amber-300/30 hover:bg-zinc-800/80'
                  }`}
                >
                  <div className="relative aspect-[59/86] w-full overflow-hidden bg-zinc-800">
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      loading="lazy"
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                  <div className="p-1.5">
                    <p className="line-clamp-2 text-[10px] font-medium leading-tight text-amber-100">
                      {card.name}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] text-zinc-500">{card.passcode}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selectedEntry ? (
        <div className="mt-4 grid gap-3 rounded-lg border border-amber-300/15 bg-zinc-950/50 p-3 md:grid-cols-2">
          <div className="flex gap-3 md:col-span-2">
            <img
              src={cardImageUrl(selectedEntry.passcode, 'half')}
              alt={selectedEntry.name}
              className="h-36 w-[5.5rem] shrink-0 rounded object-cover object-top shadow-lg"
            />
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">選択中</p>
              <p className="font-medium text-amber-100">{selectedEntry.name}</p>
              {selectedEntry.nameEn ? (
                <p className="text-xs text-zinc-400">{selectedEntry.nameEn}</p>
              ) : null}
              <p className="mt-1 text-xs text-zinc-500">パスワード: {selectedEntry.passcode}</p>
              {selectedEntry.pack ? (
                <p className="mt-1 text-xs text-zinc-500">{selectedEntry.pack}</p>
              ) : null}
            </div>
          </div>
          <label className="text-sm text-zinc-300">
            フォルダ
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="mt-1 w-full rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100"
            >
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <input
            placeholder="収納場所（任意）"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100"
          />
          <select
            value={collectionType}
            onChange={(e) => setCollectionType(e.target.value)}
            className="rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="初版">初版</option>
            <option value="再録">再録</option>
            <option value="25th">25th</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            所持数
            <input
              type="number"
              min={0}
              value={owned}
              onChange={(e) => setOwned(Number(e.target.value))}
              className="w-24 rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">画像をタップして選択してください</p>
      )}

      <button
        type="submit"
        disabled={isSaving || !selectedEntry}
        className="mt-4 w-full rounded-lg border border-amber-300/40 bg-amber-300/15 py-2 text-sm text-amber-100 disabled:opacity-40"
      >
        {isSaving ? '保存中...' : 'カードを追加して保存'}
      </button>
    </form>
  )
}
