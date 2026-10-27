import { formatFecha } from '../constants'

export default function HistorialMinutas({ minutas, fechaSeleccionada, onSeleccionar }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-3 text-sm font-semibold text-text">🗂️ Minutas generadas</p>
      {minutas.length === 0 ? (
        <p className="text-sm text-text-secondary">Sin minutas generadas todavía.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {minutas.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSeleccionar(m.fecha)}
              style={{ minHeight: '48px' }}
              className={`rounded-xl border px-4 text-left text-sm transition ${
                m.fecha === fechaSeleccionada
                  ? 'border-highlight bg-highlight/10 text-highlight'
                  : 'border-border text-text hover:border-accent'
              }`}
            >
              <p className="font-semibold capitalize">{formatFecha(m.fecha)}</p>
              <p className="text-xs text-text-secondary">Generada por {m.generada_por_detalle?.nombre}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
