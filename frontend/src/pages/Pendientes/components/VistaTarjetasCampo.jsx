const BADGE_ESTADO = {
  abierto: 'bg-error/20 text-error border-error/30',
  en_proceso: 'bg-warning/20 text-warning border-warning/30',
  bloqueado: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  cerrado: 'bg-highlight/20 text-highlight border-highlight/30',
}

export default function VistaTarjetasCampo({ pendientes, onSeleccionar }) {
  if (pendientes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-5xl">✓</p>
        <p className="text-xl font-bold text-text">No tienes pendientes asignados hoy</p>
        <p className="text-base text-text-secondary">Cuando se te asigne un pendiente, aparecerá aquí.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {pendientes.map((p) => (
        <button
          key={p.id}
          onClick={() => onSeleccionar(p)}
          style={{ minHeight: '80px' }}
          className={`w-full rounded-2xl border p-5 text-left transition hover:border-highlight ${
            p.estado === 'bloqueado'
              ? 'border-orange-500/40 bg-orange-500/5'
              : 'border-border bg-card'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-highlight">{p.titulo}</p>
              {p.descripcion && (
                <p className="mt-1 line-clamp-2 text-base text-text-secondary">{p.descripcion}</p>
              )}
            </div>
            <span
              className={`flex-shrink-0 rounded-xl border px-3 py-2 text-sm font-bold ${BADGE_ESTADO[p.estado]}`}
            >
              {p.estado_display}
            </span>
          </div>

          {p.estado === 'bloqueado' && p.motivo_bloqueo_display && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2">
              <span className="text-orange-400">⚠</span>
              <span className="text-sm text-orange-300">{p.motivo_bloqueo_display}</span>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-3 text-sm text-text-secondary">
            <span>{p.dias_abierto} día{p.dias_abierto !== 1 ? 's' : ''} abierto</span>
            {p.fecha_limite && (
              <span className="text-warning">
                Límite: {new Date(p.fecha_limite).toLocaleDateString('es-MX')}
              </span>
            )}
          </div>

          <p className="mt-3 text-right text-sm text-text-secondary">
            Toca para ver detalles →
          </p>
        </button>
      ))}
    </div>
  )
}
