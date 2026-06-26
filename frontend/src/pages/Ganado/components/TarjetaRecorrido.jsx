import { COLOR_MAP, ESTADO_CONFIG } from './colorConfig'

function formatFecha(fecha) {
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}

export default function TarjetaRecorrido({ recorrido, onClick }) {
  const estado = ESTADO_CONFIG[recorrido.estado_hato] ?? ESTADO_CONFIG.bien
  const lineColor = COLOR_MAP[recorrido.color] ?? '#60a5fa'
  const paradas = recorrido.paradas ?? []

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-border bg-card p-4 text-left transition hover:border-accent"
    >
      {/* Header: fecha + badge estado */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-semibold text-highlight">
            {formatFecha(recorrido.fecha)}
          </p>
          <p className="text-sm text-text">{recorrido.responsable_detalle?.nombre}</p>
          {recorrido.asistentes_detalle?.length > 0 && (
            <p className="text-xs text-text-secondary">
              + {recorrido.asistentes_detalle.map((a) => a.nombre).join(', ')}
            </p>
          )}
        </div>
        <div className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${estado.border} ${estado.text}`}>
          {estado.icon} {estado.label}
        </div>
      </div>

      {/* Barra de color */}
      <div
        className="mb-2 h-1 rounded-full"
        style={{ backgroundColor: lineColor, width: '100%' }}
      />

      {/* Ruta */}
      {paradas.length > 0 && (
        <p className="mb-2 line-clamp-1 text-xs text-text-secondary">
          {paradas.map((p) => p.corraleta_detalle?.nombre).filter(Boolean).join(' → ')}
        </p>
      )}

      {/* Narrativa */}
      <p className="line-clamp-2 text-sm text-text-secondary">{recorrido.narrativa}</p>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
        {recorrido.numero_cabezas && (
          <span>🐄 {recorrido.numero_cabezas} cabezas</span>
        )}
        {recorrido.fotos?.length > 0 && (
          <span>📷 {recorrido.fotos.length} foto{recorrido.fotos.length > 1 ? 's' : ''}</span>
        )}
      </div>
    </button>
  )
}
