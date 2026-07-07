export default function BotonToggleCercas({ visible, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`absolute right-2 top-2 z-[1000] rounded-lg border-2 px-3 py-1.5 text-xs font-bold backdrop-blur-sm transition ${
        visible
          ? 'border-highlight bg-highlight/20 text-highlight'
          : 'border-border bg-bg/80 text-text-secondary hover:border-accent'
      }`}
    >
      🔲 Cercas
    </button>
  )
}
