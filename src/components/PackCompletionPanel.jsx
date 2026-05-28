import { useEffect, useMemo, useState } from 'react'
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
        officialData,
      ),
    [cards, officialData],
  )

  const resolvedCount = packCompletionList.filter((p) => p.usesOfficialDenominator).length
  const rarityOfficialCount = rarityByPackList.filter((p) => p.hasOfficialBreakdown).length

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
          <RarityView
            rarityByPackList={rarityByPackList}
            isLoadingOfficial={isLoadingOfficial}
            rarityOfficialCount={rarityOfficialCount}
          />
        )}
      </div>
    </section>
  )
}

function PackView({ packCompletionList, resolvedCount, isLoadingOfficial }) {
  return (
    <>
      <p className="mb-4 text-xs text-zinc-500">
        パック内の型番から OCG（-JP）/ TCG（-EN）を判別します。OCG はニューロン収録優先、TCG は YGOPRODeck を基準にします。
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

function RarityView({ rarityByPackList, isLoadingOfficial, rarityOfficialCount }) {
  const [expandedPack, setExpandedPack] = useState(null)

  useEffect(() => {
    if (rarityByPackList.length === 0) {
      setExpandedPack(null)
      return
    }
    setExpandedPack((prev) => {
      if (prev && rarityByPackList.some((p) => p.pack === prev)) return prev
      return rarityByPackList[0].pack
    })
  }, [rarityByPackList])

  function togglePack(pack) {
    setExpandedPack((prev) => (prev === pack ? null : pack))
  }

  return (
    <>
      <p className="mb-4 text-xs text-zinc-500">
        N・R・SR・UR・SE・UL・PSE など全レアリティの公式枚数と所持率を表示します。
        OCG パックはニューロン収録を優先、TCG パックは YGOPRODeck のみ参照します。所持は型番（カード種）単位です。
        {!isLoadingOfficial && rarityByPackList.length > 0
          ? `（内訳取得 ${rarityOfficialCount} / ${rarityByPackList.length} パック）`
          : ''}
      </p>
      {isLoadingOfficial ? (
        <p className="mb-3 text-sm text-amber-300/90">レアリティ内訳を取得中…（初回は数十秒かかることがあります）</p>
      ) : null}
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
          ※ ニューロンに収録が無い、または照合できないパックは YGOPRODeck または登録済みレアリティのみ表示します
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
    marketLabel: packMarketLabel,
  } = item

  return (
    <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/50 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug text-zinc-100">{pack}</p>
          {packMarketLabel ? (
            <span className="mt-0.5 inline-block rounded border border-zinc-600/80 px-1.5 py-0.5 text-[9px] text-zinc-400">
              {packMarketLabel}
            </span>
          ) : null}
        </div>
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
  const {
    pack,
    setPrefix,
    rarities,
    hasOfficialBreakdown,
    source,
    packOwnedKinds,
    packOfficialTotal,
    packRate,
  } = packItem
  const sourceLabel =
    source === 'neuron' ? 'ニューロン' : source === 'prodeck' ? 'YGOPRODeck' : null
  const ownedTotal = packOwnedKinds ?? rarities.reduce((sum, r) => sum + r.owned, 0)
  const officialTotal = packOfficialTotal ?? null
  const headerRate = packRate

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
            <p className="text-[10px] uppercase tracking-widest text-amber-500/90">Rarity</p>
            <h3 className="text-base font-semibold leading-snug text-amber-50">{pack}</h3>
            {!isOpen ? (
              <p className="mt-1 text-[11px] text-zinc-500">
                {hasOfficialBreakdown ? `${rarities.length} レアリティ · ` : ''}
                所持 {ownedTotal} 種
                {officialTotal != null ? ` / 公式 ${officialTotal} 種` : ''}
                {sourceLabel ? `（${sourceLabel}）` : ''}
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
              <p className="text-lg font-bold tabular-nums text-amber-200">
                {headerRate != null ? `${headerRate}%` : '—'}
              </p>
            ) : null}
          </div>
        </button>

        {isOpen ? (
          <div className="border-t border-amber-800/30 pb-4 pt-3">
            {hasOfficialBreakdown && officialTotal != null ? (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-400/10 px-3 py-2.5">
                <div>
                  <p className="text-[10px] text-amber-300/80">パック合計（パック別と同じ）</p>
                  <p className="text-sm text-zinc-200">
                    所持 <span className="font-semibold text-amber-100">{ownedTotal}</span> 種
                    <span className="text-zinc-500"> / 公式 </span>
                    <span className="font-semibold text-amber-100">{officialTotal}</span> 種
                  </p>
                </div>
                <p className="text-2xl font-bold tabular-nums text-amber-200">
                  {headerRate != null ? `${headerRate}%` : '—'}
                </p>
              </div>
            ) : null}

            <div className="space-y-4">
              {rarities.map((r) => (
                <div
                  key={r.rarity}
                  className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5"
                >
                  <div className="mb-1.5 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-lg font-bold tracking-wide text-amber-100">
                        {r.rarity}
                      </p>
                      {r.rarityName ? (
                        <p className="truncate text-[10px] text-zinc-500">{r.rarityName}</p>
                      ) : null}
                    </div>
                    <p className="text-xl font-bold tabular-nums text-amber-200">{r.rate}%</p>
                  </div>
                  <RarityProgressBar
                    percent={r.rate}
                    rarity={r.rarityName ?? r.rarity}
                    className="h-3.5"
                  />
                  <p className="mt-1.5 text-[11px] text-zinc-400">
                    所持 <span className="font-medium text-zinc-200">{r.owned}</span> 種
                    {r.usesOfficial ? (
                      <>
                        <span className="text-zinc-600"> / 公式 </span>
                        <span className="font-medium text-zinc-200">{r.official}</span> 種
                      </>
                    ) : (
                      <>
                        <span className="text-zinc-600"> / 登録 </span>
                        <span className="font-medium text-zinc-200">{r.registered}</span> 種
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
