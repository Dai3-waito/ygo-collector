import { getOfuseUrl, isOfuseConfigured } from '../lib/ofuseConfig.js'

const TOOLTIP = '初版管理・再録管理などの開発支援になります'

/**
 * @param {'header' | 'footer'} [variant='header']
 * @param {string} [className]
 */
export default function SupportButton({ variant = 'header', className = '' }) {
  const url = getOfuseUrl()
  if (!isOfuseConfigured()) return null

  const isHeader = variant === 'header'
  const label = isHeader ? '☕ 開発を応援' : '開発を応援する'

  const baseLink =
    'rounded-lg outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-amber-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950'

  const headerLink = `${baseLink} support-btn-glow inline-flex items-center gap-1.5 border border-amber-300/35 bg-zinc-950/55 px-3 py-2 text-xs font-medium text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.06)] backdrop-blur-md hover:border-amber-300/55 hover:bg-amber-300/12 hover:text-amber-50 active:scale-[0.98] sm:px-3.5 sm:py-2.5 sm:text-sm`

  const footerLink = `${baseLink} text-xs text-zinc-500 underline decoration-zinc-600/80 underline-offset-4 hover:text-amber-200/90 hover:decoration-amber-400/50`

  if (isHeader) {
    return (
      <span className={`group/support relative inline-flex ${className}`}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={headerLink}
          aria-label={`${label}（OFUSE で新しいタブを開く）`}
        >
          <span aria-hidden className="support-btn-shimmer text-base leading-none">
            ☕
          </span>
          <span>開発を応援</span>
        </a>
        <span
          role="tooltip"
          id="support-btn-tooltip"
          className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-max max-w-[min(16rem,calc(100vw-2rem))] translate-y-1 rounded-lg border border-amber-300/25 bg-zinc-950/95 px-2.5 py-1.5 text-[10px] leading-snug text-amber-100/90 opacity-0 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-200 group-hover/support:translate-y-0 group-hover/support:opacity-100 group-focus-within/support:translate-y-0 group-focus-within/support:opacity-100"
        >
          {TOOLTIP}
        </span>
      </span>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${footerLink} ${className}`}
      title={TOOLTIP}
      aria-label={`${label}（OFUSE で新しいタブを開く）`}
    >
      {label}
    </a>
  )
}
