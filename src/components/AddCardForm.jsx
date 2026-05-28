import { useEffect, useMemo, useState } from 'react'
import {
  MAX_COLLECTION_SIZE,
  MAX_SEARCH_RESULTS,
  MIN_SEARCH_LENGTH,
} from '../lib/constants.js'
import { DEFAULT_FOLDER } from '../lib/foldersStorage.js'
import { normalizeForSearch } from '../lib/searchUtils.js'
import { searchYgoCards } from '../lib/ygoProDeck.js'

function catalogToNewCard(entry, folder) {
  return {
    id: entry.id,
    name: entry.name,
    pack: entry.pack,
    rarity: entry.rarity,
    imageUrl: entry.imageUrl || `/cards/${entry.id}.jpg`,
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

  const availableResults = useMemo(
    () => results.filter((r) => !ownedIds.has(r.id)),
    [results, ownedIds],
  )

  const filteredResults = useMemo(() => {
    const tokens = normalizeForSearch(search).split(' ').filter(Boolean)
    if (tokens.length === 0) return availableResults
    return availableResults.filter((card) => {
      const haystack = normalizeForSearch(
        [card.name, card.pack, card.id, card.rarity, card.passcode].join(' '),
      )
      return tokens.every((token) => haystack.includes(token))
    })
  }, [availableResults, search])

  const displayResults = filteredResults.slice(0, MAX_SEARCH_RESULTS)
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
        const found = await searchYgoCards(q, {
          maxResults: MAX_SEARCH_RESULTS,
          signal: controller.signal,
        })
        setResults(found)
        if (found.length === 0) {
          setSearchError(
            '該当するカードが見つかりませんでした。英語名（例: Blue-Eyes）や型番（例: LEDE-JP045）でも検索してください。',
          )
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        setResults([])
        setSearchError(error.message || '検索に失敗しました')
      } finally {
        if (!controller.signal.aborted) setIsSearching(false)
      }
    }, 450)

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
      <p className="text-sm font-medium text-amber-100">遊戯王カードデータベースから選択</p>
      <p className="mt-1 text-xs text-zinc-400">
        カード名を{MIN_SEARCH_LENGTH}文字以上で入力（検索結果最大{MAX_SEARCH_RESULTS}件）
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        ヒント: 日本語名だけでは見つからないことがあります。英語名・型番でも試してください。
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        登録数: {collectionCount} / {MAX_COLLECTION_SIZE}
      </p>

      <input
        type="text"
        placeholder="例: 青眼 / Blue-Eyes / LEDE-JP"
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

      <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-zinc-700/80 bg-zinc-950/60 p-1">
        {search.trim().length < MIN_SEARCH_LENGTH ? (
          <li className="px-3 py-4 text-center text-xs text-zinc-500">
            カード名を入力して検索してください
          </li>
        ) : displayResults.length === 0 && !isSearching ? (
          <li className="px-3 py-4 text-center text-xs text-zinc-500">
            {availableResults.length === 0 && results.length > 0
              ? '該当カードはすべてコレクションに登録済みです'
              : '表示できる結果がありません'}
          </li>
        ) : (
          displayResults.map((card) => {
            const isSelected = card.id === selectedId
            return (
              <li key={card.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(card)}
                  className={`flex w-full gap-3 rounded-md px-2 py-2 text-left text-sm transition ${
                    isSelected
                      ? 'bg-amber-300/20 ring-1 ring-amber-300/40'
                      : 'hover:bg-zinc-800/80'
                  }`}
                >
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt=""
                      className="h-14 w-10 shrink-0 rounded object-cover object-top"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-14 w-10 shrink-0 rounded bg-zinc-800" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-amber-100">{card.name}</span>
                    <span className="mt-0.5 block text-xs text-zinc-400">
                      {card.id}
                      {card.rarity ? ` · ${card.rarity}` : ''}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">{card.pack}</span>
                  </span>
                </button>
              </li>
            )
          })
        )}
      </ul>
      {filteredResults.length > MAX_SEARCH_RESULTS ? (
        <p className="mt-1 text-xs text-zinc-500">
          先頭 {MAX_SEARCH_RESULTS} 件を表示しています（絞り込みで検索してください）
        </p>
      ) : null}

      {selectedEntry ? (
        <div className="mt-4 grid gap-3 rounded-lg border border-amber-300/15 bg-zinc-950/50 p-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="text-xs text-zinc-500">選択中</p>
            <p className="font-medium text-amber-100">
              {selectedEntry.name}{' '}
              <span className="text-sm font-normal text-zinc-400">({selectedEntry.id})</span>
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {selectedEntry.pack}
              {selectedEntry.rarity ? ` · ${selectedEntry.rarity}` : ''}
            </p>
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
        <p className="mt-3 text-xs text-zinc-500">検索結果からカードを選んでください</p>
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
