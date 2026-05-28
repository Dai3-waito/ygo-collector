import { useState } from 'react'
import { DEFAULT_FOLDER } from '../lib/foldersStorage.js'

export default function FolderBar({
  folders,
  activeFolder,
  onSelectFolder,
  onAddFolder,
  cardCounts,
}) {
  const [newFolderName, setNewFolderName] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  function handleAddFolder(e) {
    e.preventDefault()
    const name = newFolderName.trim()
    if (!name || name === DEFAULT_FOLDER) return
    onAddFolder(name)
    setNewFolderName('')
    setShowAdd(false)
  }

  return (
    <section className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSelectFolder('all')}
          className={`rounded-lg border px-3 py-1.5 text-xs transition ${
            activeFolder === 'all'
              ? 'border-amber-300/50 bg-amber-300/15 text-amber-100'
              : 'border-zinc-600 text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          すべて ({cardCounts.all ?? 0})
        </button>
        {folders.map((folder) => (
          <button
            key={folder}
            type="button"
            onClick={() => onSelectFolder(folder)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition ${
              activeFolder === folder
                ? 'border-amber-300/50 bg-amber-300/15 text-amber-100'
                : 'border-zinc-600 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {folder} ({cardCounts[folder] ?? 0})
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-lg border border-dashed border-amber-300/35 px-3 py-1.5 text-xs text-amber-200/90 hover:bg-amber-300/10"
        >
          ＋ フォルダ
        </button>
      </div>
      {showAdd ? (
        <form onSubmit={handleAddFolder} className="mt-2 flex flex-wrap gap-2">
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="フォルダ名（例: メインバインダー）"
            className="min-w-[200px] flex-1 rounded-lg border border-amber-300/30 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100"
          />
          <button
            type="submit"
            className="rounded-lg border border-amber-300/40 bg-amber-300/15 px-4 py-2 text-sm text-amber-100"
          >
            作成
          </button>
        </form>
      ) : null}
    </section>
  )
}
