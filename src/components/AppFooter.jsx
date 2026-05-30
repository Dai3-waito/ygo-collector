import SupportButton from './SupportButton.jsx'

export default function AppFooter() {
  return (
    <footer className="mt-10 border-t border-amber-300/10 pt-6 pb-2 text-center">
      <SupportButton variant="footer" />
      <p className="mt-3 text-[10px] tracking-wide text-zinc-600">
        YGO Collector — OCG collection library
      </p>
    </footer>
  )
}
