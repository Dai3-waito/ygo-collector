import { useMemo, useState } from 'react'
import { computePackCompletionList } from '../lib/packCompletion.js'
import { computeRarityCompletionByPack } from '../lib/rarityCompletion.js'
import { ProgressBar, RarityProgressBar } from '../lib/cardUi.jsx'

export default function PackCompletionPanel({
  cards,
  officialData,
  isLoadingOfficial,
  loadOfficialError,
}) {
  const [viewMode, setViewMode] = useState('pack')

  const packCompletionList = useMemo(
    () => computePackCompletionList(cards, officialData),
    [cards, officialData],
  )

  const rarityByPackList = useMemo(
    () =>
      computeRarityCompletionByPack(
        cards,
        officialData?.officialRarityByPack,
        officialData?.setMetaByPack,
        officialData?.raritySourceByPack,
      ),
    [cards, officialData],
  )

  const resolvedCount = packCompletionList.filter((p) => p.usesOfficialDenominator).length

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-300/25 bg-[linear-gradient(145deg,#1a1510_0%,#0f0f12_45%,#121018_100%)] shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      <div className="border-b border-amber-300/15 bg-zinc-950/40 px-5 py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-300/80">Collection Progress</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-100">コレクション率</h2>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setViewMode('pack')}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              viewMode === 'pack'
                ? 'border border-amber-400/50 bg-amber-400/15 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                : 'border border-zinc-700/80 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
            }`}
          >
            パック別
          </button>
          <button
            type="button"
            onClick={() => setViewMode('rarity')}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              viewMode === 'rarity'
                ? 'border border-amber-400/50 bg-amber-400/15 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                : 'border border-zinc-700/80 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
            }`}
          >
            レアリティ別
          </button>
        </div>
      </div>

      <div className="p-5">
        {isLoadingOfficial ? (
          <p className="text-sm text-amber-300/80">公式データを読込中...</p>
        ) : null}
        {loadOfficialError ? (
          <p className="text-sm text-amber-200/80">{loadOfficialError}</p>
        ) : null}

        {viewMode === 'pack' ? (
          <PackView
            packCompletionList={packCompletionList}
            resolvedCount={resolvedCount}
            isLoadingOfficial={isLoadingOfficial}
          />
        ) : (
          <RarityView rarityByPackList={rarityByPackList} isLoadingOfficial={isLoadingOfficial} />
        )}
      </div>
    </section>
  )
}

function PackView({ packCompletionList, resolvedCount, isLoadingOfficial }) {
  return (
    <>
      <p className="mb-4 text-xs text-zinc-500">
        遊戯王ニューロン「収録」の総種類数を基準に計算します。
        {!isLoadingOfficial && packCompletionList.length > 0
          ? `（${resolvedCount} / ${packCompletionList.length} パック取得済み）`
          : ''}
      </p>
      {packCompletionList.length === 0 ? (
        <p className="text-sm text-zinc-400">カードを追加すると表示されます。</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packCompletionList.map((item) => (
            <PackCompletionCard key={item.pack} item={item} />
          ))}
        </div>
      )}
    </>
  )
}

function RarityView({ rarityByPackList, isLoadingOfficial }) {
  const [expandedPack, setExpandedPack] = useState(null)

  function togglePack(pack) {
    setExpandedPack((prev) => (prev === pack ? null : pack))
  }

  return (
    <>
      <p className="mb-4 text-xs text-zinc-500">
        パックをタップして開くと、収録されている全レアリティの所持率を表示します。分母は
        YGOPRODeck を優先し、未取得のパックは遊戯王ニューロン「収録」から補います。
      </p>
      {rarityByPackList.length === 0 ? (
        <p className="text-sm text-zinc-400">カードを追加すると表示されます。</p>
      ) : (
        <div className="space-y-2">
          {rarityByPackList.map((packItem) => (
            <BinderPackRarityAccordion
              key={packItem.pack}
              packItem={packItem}
              isOpen={expandedPack === packItem.pack}
              onToggle={() => togglePack(packItem.pack)}
            />
          ))}
        </div>
      )}
      {!isLoadingOfficial && rarityByPackList.some((p) => !p.hasOfficialBreakdown) ? (
        <p className="mt-4 text-[10px] text-zinc-600">
          ※ 型番が無いカードのみ、登録済みレアリティを分母にしています
        </p>
      ) : null}
    </>
  )
}

function PackCompletionCard({ item }) {
  const {
    pack,
    rate,
    ownedKinds,
    officialTotal,
    usesOfficialDenominator,
    sourceLabel,
    neuronUrl,
  } = item

  return (
    <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/50 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-zinc-100">{pack}</p>
        <p className="shrink-0 text-lg font-bold tabular-nums text-amber-200">
          {rate != null ? `${rate}%` : '—'}
        </p>
      </div>
      <ProgressBar percent={rate ?? 0} />
      <p className="mt-2 text-[11px] text-zinc-500">
        所持 {ownedKinds} 種
        {usesOfficialDenominator ? (
          <>
            {' '}
            / 公式 {officialTotal} 種
            {sourceLabel ? <span className="text-zinc-600">（{sourceLabel}）</span> : null}
          </>
        ) : (
          <> — 公式枚数未取得</>
        )}
      </p>
      {neuronUrl ? (
        <a
          href={neuronUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[10px] text-cyan-400/90 underline hover:text-cyan-300"
        >
          公式でこのパックを確認（収録） →
        </a>
      ) : null}
    </div>
  )
}

function BinderPackRarityAccordion({ packItem, isOpen, onToggle }) {
  const { pack, setPrefix, rarities, hasOfficialBreakdown, source } = packItem
  const sourceLabel =
    source === 'prodeck' ? 'YGOPRODeck' : source === 'neuron' ? 'ニューロン' : null
  const ownedTotal = rarities.reduce((sum, r) => sum + r.owned, 0)
  const officialTotal = hasOfficialBreakdown
    ? rarities.reduce((sum, r) => sum + (r.official ?? 0), 0)
    : null
  const avgRate =
    rarities.length > 0
      ? Math.round(rarities.reduce((sum, r) => sum + r.rate, 0) / rarities.length)
      : 0

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-shadow ${
        isOpen
          ? 'border-amber-700/50 shadow-[inset_0_1px_0_rgba(255,220,150,0.08),0_8px_32px_rgba(0,0,0,0.5)]'
          : 'border-amber-900/30 shadow-[0_4px_16px_rgba(0,0,0,0.35)]'
      } bg-[linear-gradient(135deg,#2a2218_0%,#141210_50%,#1c1814_100%)]`}
    >
      <div
        className="pointer-events-none absolute left-3 top-0 bottom-0 w-4 bg-[repeating-linear-gradient(180deg,#3d3428_0px,#3d3428_8px,#1a1612_8px,#1a1612_16px)] opacity-60"
        aria-hidden
      />
      <div className="relative pl-10 pr-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex w-full items-center gap-3 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 rounded-lg"
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-700/40 bg-zinc-950/60 text-amber-200 transition-transform ${
              isOpen ? 'rotate-90' : ''
            }`}
            aria-hidden
          >
            ›
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-amber-600/90">Pack</p>
            <h3 className="text-base font-semibold leading-snug text-amber-50">{pack}</h3>
            {!isOpen ? (
              <p className="mt-1 text-[11px] text-zinc-500">
                {rarities.length} レアリティ
                {sourceLabel ? ` · ${sourceLabel}` : ''}
                {hasOfficialBreakdown && officialTotal != null
                  ? ` · 所持 ${ownedTotal} / 公式 ${officialTotal} 種`
                  : ownedTotal > 0
                    ? ` · 所持 ${ownedTotal} 種`
                    : ''}
                {' · 平均 '}
                {avgRate}%
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            {setPrefix ? (
              <span className="mb-1 block rounded border border-amber-700/40 bg-zinc-950/50 px-2 py-0.5 font-mono text-[10px] text-amber-200/80">
                {setPrefix}
              </span>
            ) : null}
            {!isOpen ? (
              <p className="text-lg font-bold tabular-nums text-amber-200/90">{avgRate}%</p>
            ) : null}
          </div>
        </button>

        {isOpen ? (
          <div className="space-y-4 border-t border-amber-800/30 pb-4 pt-3">
            {rarities.map((r) => (
              <div key={r.rarity}>
                <div className="mb-1.5 flex items-end justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-200">{r.rarity}</p>
                  <p className="text-xl font-bold tabular-nums text-amber-200">{r.rate}%</p>
                </div>
                <RarityProgressBar percent={r.rate} rarity={r.rarity} />
                <p className="mt-1 text-[10px] text-zinc-500">
                  所持 {r.owned}
                  {r.usesOfficial ? (
                    <> / 公式 {r.official} 種</>
                  ) : (
                    <> / 登録 {r.registered} 種</>
                  )}
                  {!hasOfficialBreakdown && r.registered > 0 ? (
                    <span className="text-zinc-600">（参考）</span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
