export function getRarityTheme(rarity) {
  const r = String(rarity ?? '')
  if (r.includes('25th') || r.includes('プリズマ')) {
    return 'from-fuchsia-500/30 via-amber-300/20 to-cyan-400/25'
  }
  if (r.includes('シークレット')) {
    return 'from-indigo-500/30 via-zinc-500/20 to-amber-400/25'
  }
  if (r.includes('ウルトラ')) {
    return 'from-yellow-500/35 via-amber-400/25 to-orange-500/30'
  }
  if (r.includes('スーパー')) {
    return 'from-sky-500/30 via-zinc-500/20 to-violet-500/25'
  }
  return 'from-zinc-600/35 via-zinc-500/20 to-zinc-700/30'
}

export function ProgressBar({ percent, className = 'h-2.5' }) {
  const width = Math.min(100, Math.max(0, percent))
  return (
    <div
      className={`overflow-hidden rounded-full bg-zinc-800/90 ${className}`}
      role="progressbar"
      aria-valuenow={width}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-700 via-amber-400 to-amber-200 transition-[width] duration-300"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

function rarityBarGradient(rarity) {
  const r = String(rarity ?? '').toLowerCase()
  if (r.includes('quarter century') || r.includes('25th')) {
    return 'from-violet-600 via-fuchsia-400 to-amber-300'
  }
  if (r.includes('prismatic') || r.includes('プリズマ')) {
    return 'from-fuchsia-600 via-pink-400 to-cyan-300'
  }
  if (r.includes('ultimate') || r.includes('ウルトラ')) {
    return 'from-yellow-600 via-amber-400 to-orange-400'
  }
  if (r.includes('secret') || r.includes('シークレット')) {
    return 'from-indigo-600 via-violet-400 to-slate-300'
  }
  if (r.includes('super') || r.includes('スーパー')) {
    return 'from-sky-600 via-blue-400 to-indigo-300'
  }
  return 'from-zinc-600 via-zinc-400 to-zinc-300'
}

export function RarityProgressBar({ percent, rarity, className = 'h-3' }) {
  const width = Math.min(100, Math.max(0, percent))
  const gradient = rarityBarGradient(rarity)
  return (
    <div
      className={`overflow-hidden rounded-full border border-zinc-700/80 bg-zinc-900/90 shadow-inner ${className}`}
      role="progressbar"
      aria-valuenow={width}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r ${gradient} shadow-[0_0_12px_rgba(251,191,36,0.25)] transition-[width] duration-500`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
