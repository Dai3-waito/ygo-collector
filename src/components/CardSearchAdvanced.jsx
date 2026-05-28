import { useEffect, useMemo, useRef, useState } from 'react'
import { CARD_THEME_OPTIONS } from '../data/cardThemes.js'
import {
  describeCategoryFilters,
  EMPTY_CATEGORY_FILTERS,
  sanitizeCategoryFilters,
  visibleFilterGroups,
} from '../lib/cardCategory.js'
import { getThemeByKey } from '../data/cardThemes.js'

function filterFieldForGroup(groupId) {
  if (groupId === 'main') return 'mainType'
  if (groupId === 'race') return 'race'
  if (groupId === 'attribute') return 'attribute'
  return 'subtype'
}

function ChipOptions({ group, field, filters, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {group.options.map((opt) => {
        const selected = filters[field] === opt.key
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() =>
              onChange(
                sanitizeCategoryFilters({
                  ...filters,
                  [field]: selected ? '' : opt.key,
                }),
              )
            }
            className={`rounded-full border px-2 py-0.5 text-[10px] transition ${
              selected
                ? 'border-amber-300/50 bg-amber-300/20 text-amber-100'
                : 'border-zinc-700/80 bg-zinc-900/80 text-zinc-400 hover:border-amber-300/25 hover:text-zinc-200'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function ThemePicker({ filters, onChange, isOpen, onToggle }) {
  const [filterText, setFilterText] = useState('')
  const selectedKey = filters.theme
  const selectedLabel = selectedKey ? getThemeByKey(selectedKey)?.label : null

  const visibleThemes = useMemo(() => {
    const q = filterText.trim()
    if (!q) return CARD_THEME_OPTIONS
    return CARD_THEME_OPTIONS.filter(
      (t) => t.label.includes(q) || t.searchQuery.includes(q),
    )
  }, [filterText])

  useEffect(() => {
    if (!isOpen) setFilterText('')
  }, [isOpen])

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[11px] transition ${
          selectedKey
            ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
            : 'border-zinc-700/80 bg-zinc-900/80 text-zinc-300 hover:border-amber-300/30'
        }`}
        aria-expanded={isOpen}
      >
        <span>{selectedLabel ?? 'シリーズ・テーマを選ぶ'}</span>
        <span className="text-zinc-500">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen ? (
        <div className="mt-1.5 rounded-lg border border-zinc-700/80 bg-zinc-950/90 p-2 shadow-lg">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="テーマ名で絞り込み…"
            className="mb-2 w-full rounded-md border border-zinc-700/80 bg-zinc-900/80 px-2 py-1.5 text-[11px] text-zinc-100 outline-none focus:border-amber-300/40"
          />
          <div className="max-h-52 overflow-y-auto">
            {visibleThemes.length === 0 ? (
              <p className="px-2 py-4 text-center text-[10px] text-zinc-500">
                該当するテーマがありません
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {visibleThemes.map((theme) => {
                  const selected = selectedKey === theme.key
                  return (
                    <button
                      key={theme.key}
                      type="button"
                      onClick={() => {
                        onChange(
                          sanitizeCategoryFilters({
                            ...filters,
                            theme: selected ? '' : theme.key,
                          }),
                        )
                        onToggle()
                      }}
                      className={`rounded-md border px-2 py-1.5 text-left text-[10px] transition ${
                        selected
                          ? 'border-amber-300/50 bg-amber-300/20 text-amber-100'
                          : 'border-transparent bg-zinc-900/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/80'
                      }`}
                    >
                      {theme.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          {selectedKey ? (
            <button
              type="button"
              onClick={() => {
                onChange({ ...filters, theme: '' })
                onToggle()
              }}
              className="mt-2 w-full rounded-md border border-zinc-700/80 py-1 text-[10px] text-zinc-500 hover:text-zinc-300"
            >
              テーマの選択を解除
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default function CardSearchAdvanced({
  open,
  onToggle,
  filters,
  onChange,
  onApply,
  onClear,
}) {
  const activeLabels = describeCategoryFilters(filters)
  const hasFilters = activeLabels.length > 0
  const cardFilterGroups = visibleFilterGroups(filters)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) setThemePickerOpen(false)
  }, [open])

  useEffect(() => {
    if (!themePickerOpen) return undefined

    function handlePointerDown(event) {
      if (panelRef.current?.contains(event.target)) return
      setThemePickerOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [themePickerOpen])

  return (
    <div className="mt-3" ref={panelRef}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-lg border border-amber-300/25 bg-zinc-950/50 px-3 py-2 text-left text-xs text-amber-100/90 hover:border-amber-300/40"
        aria-expanded={open}
      >
        <span>詳細な検索設定{hasFilters ? `（${activeLabels.join('・')}）` : ''}</span>
        <span className="text-zinc-500">{open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        <div className="mt-2 space-y-3 rounded-lg border border-zinc-700/80 bg-zinc-950/70 p-3">
          <div>
            <p className="mb-0.5 text-[11px] font-medium text-amber-100/90">シリーズ・テーマ</p>
            <p className="mb-1.5 text-[10px] text-zinc-500">デッキ名・カード系列（青眼、閃刀姫 など）</p>
            <ThemePicker
              filters={filters}
              onChange={onChange}
              isOpen={themePickerOpen}
              onToggle={() => setThemePickerOpen((v) => !v)}
            />
          </div>

          <div className="border-t border-zinc-800/80 pt-3">
            <p className="mb-0.5 text-[11px] font-medium text-amber-100/90">カードの分類</p>
            <p className="mb-2 text-[10px] text-zinc-500">
              ルール上の種類・種族・属性（大分類を選ぶと関連項目だけ表示）
            </p>
            <div className="space-y-3">
              {cardFilterGroups.map((group) => (
                <div key={group.id}>
                  <p className="mb-1.5 text-[11px] font-medium text-zinc-400">{group.label}</p>
                  <ChipOptions
                    group={group}
                    field={filterFieldForGroup(group.id)}
                    filters={filters}
                    onChange={onChange}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-zinc-800/80 pt-3">
            <button
              type="button"
              onClick={onApply}
              disabled={!hasFilters}
              className="rounded-lg border border-amber-300/40 bg-amber-300/15 px-3 py-1.5 text-xs text-amber-100 disabled:opacity-40"
            >
              条件を反映
            </button>
            <button
              type="button"
              onClick={() => {
                onChange({ ...EMPTY_CATEGORY_FILTERS })
                setThemePickerOpen(false)
              }}
              className="rounded-lg border border-zinc-600/80 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
            >
              条件をクリア
            </button>
            {onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="rounded-lg border border-zinc-600/80 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300"
              >
                閉じる
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
