export default function TabsGanado({ tabs, vistaActual, onCambiar }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onCambiar(t.id)}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            vistaActual === t.id
              ? 'bg-accent text-highlight'
              : 'border border-border text-text-secondary hover:border-accent hover:text-highlight'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
