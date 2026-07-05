/**
 * Grid de chips para armar una ruta en orden por click — mismo patrón visual
 * que usa el vaquero al agregar paradas (ver PantallaEnCurso).
 * seleccion: [{id, nombre}] en el orden en que se agregaron.
 */
export default function SelectorCorraletasOrden({ corraletas, seleccion, onAgregar, onQuitarUltima }) {
  const seleccionadosIds = new Set(seleccion.map((s) => s.id))

  return (
    <div className="space-y-4">
      {seleccion.length > 0 && (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">Ruta</p>
          <p className="text-sm text-text">
            {seleccion.map((p, i) => (
              <span key={p.id}>
                <span className="font-mono text-highlight">{i + 1}.</span> <span>{p.nombre}</span>
                {i < seleccion.length - 1 && <span className="text-text-secondary"> → </span>}
              </span>
            ))}
          </p>
        </div>
      )}

      {seleccion.length === 0 && (
        <p className="text-center text-sm text-text-secondary">
          Toca las corraletas en el orden en que quieres que se visiten.
        </p>
      )}

      {seleccion.length > 0 && (
        <button
          type="button"
          onClick={onQuitarUltima}
          className="w-full rounded-xl border border-warning py-3 text-sm font-semibold text-warning transition hover:bg-card"
        >
          ← Quitar última parada ({seleccion[seleccion.length - 1]?.nombre})
        </button>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">Corraletas disponibles</p>
        <div className="grid grid-cols-2 gap-2">
          {corraletas.map((c) => {
            const isSelected = seleccionadosIds.has(c.id)
            const orden = seleccion.findIndex((p) => p.id === c.id) + 1
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { if (!isSelected) onAgregar(c) }}
                className={`flex min-h-[48px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? 'border-highlight bg-accent text-highlight'
                    : 'border-border text-text hover:border-accent'
                }`}
              >
                {isSelected && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-highlight text-xs font-bold text-bg">
                    {orden}
                  </span>
                )}
                <span className="leading-tight">{c.nombre}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
