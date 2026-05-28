import { useEffect, useMemo, useState } from 'react'
import {
  MAX_COLLECTION_SIZE,
  MIN_SEARCH_LENGTH,
  SEARCH_DISPLAY_LIMIT,
} from '../lib/constants.js'
import { DEFAULT_FOLDER } from '../lib/foldersStorage.js'
import { detectImageLangFromQuery, IMAGE_LANG_OPTIONS } from '../lib/imageLang.js'
import { fetchCardPrints } from '../lib/ygoPrints.js'
import { cardImageUrl, lookupCdbBySetCode } from '../lib/ygoCdb.js'
import { searchCardsReliable } from '../lib/cardSearch.js'
import { resolveCanonicalPackName } from '../lib/packTotalsStorage.js'

function printKey(print) {
  return `${print.setCode}|${print.rarity}`
}

function resultKey(entry) {
  return `${entry.passcode}-${entry.cid ?? ''}`
}

function imageKeyForEntry(entry, printCdbEntry) {
  if (
    printCdbEntry &&
    String(printCdbEntry.passcode) === String(entry?.passcode) &&
    printCdbEntry.cid
  ) {
    return printCdbEntry.cid
  }
  return entry?.cid ?? entry?.passcode
}

function buildCardFromSelection(entry, print, folder, imageLang, printCdbEntry) {
  const cardId = print?.setCode ?? entry.passcode
  const imageKey = imageKeyForEntry(entry, printCdbEntry)
  const packRaw = print?.setName ?? entry.pack
  return {
    id: cardId,
    name: entry.name,
    pack: resolveCanonicalPackName(packRaw) || packRaw,
    rarity: print?.rarity ?? '',
    imageUrl: cardImageUrl(imageKey, { lang: imageLang, size: 'full' }),
    imageFallback: cardImageUrl(entry.passcode, { lang: 'ygopro', size: 'full' }),
    owned: 1,
    location: '',
    collectionType: '',
    folder: folder || DEFAULT_FOLDER,
    passcode: entry.passcode,
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
  const [imageLang, setImageLang] = useState('jp')
  const [results, setResults] = useState([])
  const [selectedPasscode, setSelectedPasscode] = useState('')
  const [selectedResultKey, setSelectedResultKey] = useState('')
  const [prints, setPrints] = useState([])
  const [selectedPrintKey, setSelectedPrintKey] = useState('')
  const [loadingPrints, setLoadingPrints] = useState(false)
  const [owned, setOwned] = useState(1)
  const [location, setLocation] = useState('')
  const [folder, setFolder] = useState(DEFAULT_FOLDER)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [printCdbEntry, setPrintCdbEntry] = useState(null)

  const ownedIds = useMemo(() => new Set(ownedCards.map((c) => c.id)), [ownedCards])
  const atCollectionLimit = collectionCount >= MAX_COLLECTION_SIZE

  const selectedEntry = results.find((r) => resultKey(r) === selectedResultKey)
  const selectedPrint = prints.find((p) => printKey(p) === selectedPrintKey)

  const previewCard = selectedEntry
    ? buildCardFromSelection(
        selectedEntry,
        selectedPrint ?? prints[0],
        folder,
        imageLang,
        null,
      )
    : null

  const previewImageSrc =
    selectedEntry?.imageUrl ??
    cardImageUrl(selectedEntry?.cid ?? selectedEntry?.passcode, {
      lang: imageLang,
      size: 'half',
    })
  const previewImageFallback =
    selectedEntry?.imageFallback ??
    cardImageUrl(selectedEntry?.passcode, { lang: 'ygopro', size: 'half' })

  const displayResults = useMemo(
    () => results.slice(0, SEARCH_DISPLAY_LIMIT),
    [results],
  )

  useEffect(() => {
    setImageLang(detectImageLangFromQuery(search))
  }, [search])

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
        const found = await searchCardsReliable(q, {
          maxResults: SEARCH_DISPLAY_LIMIT,
          signal: controller.signal,
          imageLang,
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
  }, [search, imageLang])

  useEffect(() => {
    if (!selectedPasscode) {
      setPrints([])
      setSelectedPrintKey('')
      setPrintCdbEntry(null)
      return
    }

    const controller = new AbortController()
    setLoadingPrints(true)
    fetchCardPrints(selectedPasscode, controller.signal)
      .then((list) => {
        setPrints(list)
        if (list.length > 0) setSelectedPrintKey(printKey(list[0]))
        else setSelectedPrintKey('')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setPrints([])
        setSelectedPrintKey('')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPrints(false)
      })

    return () => controller.abort()
  }, [selectedPasscode])

  useEffect(() => {
    const setCode = selectedPrint?.setCode
    if (!setCode) {
      setPrintCdbEntry(null)
      return
    }

    const controller = new AbortController()
    lookupCdbBySetCode(setCode, { signal: controller.signal, imageLang })
      .then((entry) => {
        if (!controller.signal.aborted) setPrintCdbEntry(entry)
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        if (!controller.signal.aborted) setPrintCdbEntry(null)
      })

    return () => controller.abort()
  }, [selectedPrintKey, selectedPrint?.setCode, imageLang])

  function handleSelect(card) {
    setSelectedResultKey(resultKey(card))
    setSelectedPasscode(card.passcode)
    setPrintCdbEntry(null)
    setOwned(1)
    setLocation('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!selectedEntry || atCollectionLimit) return

    const card = buildCardFromSelection(
      selectedEntry,
      selectedPrint ?? prints[0],
      folder,
      imageLang,
      printCdbEntry,
    )

    if (ownedIds.has(card.id)) {
      setSearchError(`「${card.id}」は既にコレクションにあります。別のレアリティを選んでください。`)
      return
    }

    onAdd({
      ...card,
      owned: Number(owned) || 0,
      location: location.trim(),
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
        日本語名・ルビ・パスワードで検索（関連度の高い順・最大{SEARCH_DISPLAY_LIMIT}件）
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        登録数: {collectionCount} / {MAX_COLLECTION_SIZE}
      </p>

      <div className="mt-3 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="例: 青眼の白龍 / 灰流うらら / 89631139"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setSelectedPasscode('')
            setSelectedResultKey('')
          }}
          className="min-w-[200px] flex-1 rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-300"
        />
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          カード画像
          <select
            value={imageLang}
            onChange={(e) => setImageLang(e.target.value)}
            className="rounded-lg border border-amber-300/30 bg-zinc-950/80 px-2 py-2 text-sm text-zinc-100"
          >
            {IMAGE_LANG_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isSearching ? (
        <p className="mt-2 text-xs text-amber-300/80">検索中...</p>
      ) : null}
      {searchError ? <p className="mt-2 text-xs text-rose-300/90">{searchError}</p> : null}

      {search.trim().length >= MIN_SEARCH_LENGTH ? (
        <p className="mt-2 text-xs text-zinc-400">
          {isSearching
            ? '…'
            : `${displayResults.length} 件表示（名前一致を優先・効果文のみのヒットは下げています）`}
        </p>
      ) : null}

      <div className="mt-3 max-h-[28rem] overflow-y-auto rounded-lg border border-zinc-700/80 bg-zinc-950/60 p-2">
        {search.trim().length < MIN_SEARCH_LENGTH ? (
          <p className="px-2 py-8 text-center text-xs text-zinc-500">
            カード名を入力すると、画像一覧が表示されます
          </p>
        ) : displayResults.length === 0 && !isSearching ? (
          <p className="px-2 py-8 text-center text-xs text-zinc-500">
            表示できる結果がありません
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {displayResults.map((card) => {
              const isSelected = resultKey(card) === selectedResultKey
              const imageKey = card.cid ?? card.passcode
              const imgSrc =
                card.imageUrl ?? cardImageUrl(imageKey, { lang: imageLang, size: 'half' })
              const imgFallback =
                card.imageFallback ??
                cardImageUrl(card.passcode, { lang: 'ygopro', size: 'half' })
              return (
                <button
                  key={`${card.passcode}-${card.cid}`}
                  type="button"
                  onClick={() => handleSelect(card)}
                  className={`flex flex-col overflow-hidden rounded-lg border text-left transition ${
                    isSelected
                      ? 'border-amber-300/60 bg-amber-300/15 ring-2 ring-amber-300/50'
                      : 'border-zinc-700/80 bg-zinc-900/50 hover:border-amber-300/30 hover:bg-zinc-800/80'
                  }`}
                >
                  <div className="relative aspect-[59/86] w-full overflow-hidden bg-zinc-800">
                    <img
                      src={imgSrc}
                      alt={card.name}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        if (e.currentTarget.src !== imgFallback) {
                          e.currentTarget.src = imgFallback
                        }
                      }}
                      className="h-full w-full object-cover object-top"
                    />
                    {card.nameMatch ? (
                      <span className="absolute left-1 top-1 rounded bg-amber-400/90 px-1 py-0.5 text-[8px] font-medium text-zinc-950">
                        名前
                      </span>
                    ) : null}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-[11px] font-medium leading-tight text-amber-100">
                      {card.name}
                    </p>
                    {card.nameEn ? (
                      <p className="mt-0.5 line-clamp-1 text-[9px] text-zinc-500">{card.nameEn}</p>
                    ) : null}
                    <p className="mt-0.5 truncate text-[9px] text-zinc-600">{card.passcode}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selectedEntry ? (
        <div className="mt-4 space-y-3 rounded-lg border border-amber-300/15 bg-zinc-950/50 p-3">
          <div className="flex gap-3">
            {selectedEntry ? (
              <img
                src={previewImageSrc}
                alt={selectedEntry.name}
                onError={(e) => {
                  if (e.currentTarget.src !== previewImageFallback) {
                    e.currentTarget.src = previewImageFallback
                  }
                }}
                className="h-36 w-[5.5rem] shrink-0 rounded object-cover object-top shadow-lg ring-1 ring-amber-400/30"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-500">選択中</p>
              <p className="font-medium text-amber-100">{selectedEntry.name}</p>
              {selectedEntry.nameEn ? (
                <p className="text-xs text-zinc-400">{selectedEntry.nameEn}</p>
              ) : null}
              <p className="mt-1 text-xs text-zinc-500">パスワード: {selectedEntry.passcode}</p>
            </div>
          </div>

          <label className="block text-sm text-zinc-300">
            レアリティ・収録（このカードに存在するものだけ）
            {loadingPrints ? (
              <span className="ml-2 text-xs text-amber-300/80">読込中...</span>
            ) : null}
            <select
              value={selectedPrintKey}
              onChange={(e) => setSelectedPrintKey(e.target.value)}
              disabled={prints.length === 0}
              className="mt-1 w-full rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50"
            >
              {prints.length === 0 ? (
                <option value="">レアリティ情報なし（パスワードで登録）</option>
              ) : (
                prints.map((p) => (
                  <option key={printKey(p)} value={printKey(p)}>
                    {p.rarity}
                    {p.isJp ? ' [JP]' : ''} — {p.setCode}
                    {p.setName ? ` (${p.setName})` : ''}
                  </option>
                ))
              )}
            </select>
          </label>

          <div className="grid gap-3 md:grid-cols-2">
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
            <label className="flex items-center gap-2 text-sm text-zinc-300 md:col-span-2">
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
          {previewCard ? (
            <p className="text-xs text-zinc-500">
              登録 ID: <span className="text-amber-200/90">{previewCard.id}</span>
              {previewCard.rarity ? ` / ${previewCard.rarity}` : ''}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">画像をタップして選択してください</p>
      )}

      <button
        type="submit"
        disabled={isSaving || !selectedEntry || loadingPrints}
        className="mt-4 w-full rounded-lg border border-amber-300/40 bg-amber-300/15 py-2 text-sm text-amber-100 disabled:opacity-40"
      >
        {isSaving ? '保存中...' : 'カードを追加して保存'}
      </button>
    </form>
  )
}
