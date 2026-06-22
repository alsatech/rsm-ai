import { ESTADO, MODULO_ICON } from '../estadoConfig'

export default function VistaTarjetasCampo({ pendientes, onSeleccionar }) {
  if (pendientes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-6xl">✅</p>
        <p className="text-xl font-bold text-white">Sin pendientes asignados</p>
        <p className="text-base text-zinc-500">Cuando se te asigne uno, aparecerá aquí.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {pendientes.map((p) => {
        const conf = ESTADO[p.estado] ?? ESTADO.abierto
        const moduloIcon = MODULO_ICON[p.modulo_relacionado]
        const fechaLimite = p.fecha_limite
          ? new Date(p.fecha_limite + 'T00:00:00').toLocaleDateString('es-MX', {
              day: '2-digit', month: 'short',
            })
          : null

        return (
          <button
            key={p.id}
            onClick={() => onSeleccionar(p)}
            style={{ minHeight: '96px', boxShadow: `0 0 20px ${conf.glowRgba}` }}
            className={`w-full rounded-2xl border border-l-4 bg-[#080808] p-5 text-left transition-all active:scale-[0.99] ${conf.borderColor} ${conf.borderL}`}
          >
            {/* Badge de estado — prominente arriba */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <span
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold ${conf.badge}`}
                style={{ boxShadow: `0 0 10px ${conf.glowRgba}` }}
              >
                <span>{conf.icon}</span>
                <span>{p.estado_display}</span>
              </span>
              {moduloIcon && p.modulo_relacionado !== 'ninguno' && (
                <span className="rounded-lg bg-zinc-900 px-2 py-1 text-xs text-zinc-400">
                  {moduloIcon} {p.modulo_display}
                </span>
              )}
            </div>

            {/* Título */}
            <p className="text-lg font-bold leading-snug text-white">{p.titulo}</p>

            {/* Descripción corta */}
            {p.descripcion && (
              <p className="mt-1.5 line-clamp-2 text-base text-zinc-500">{p.descripcion}</p>
            )}

            {/* Bloqueo */}
            {p.estado === 'bloqueado' && p.motivo_bloqueo_display && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2">
                <span>⚠</span>
                <span className="text-sm font-medium text-orange-300">{p.motivo_bloqueo_display}</span>
              </div>
            )}

            {/* Footer: días + fecha límite */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-3 text-sm text-zinc-600">
                <span>📅 {p.dias_abierto}d abierto</span>
                {fechaLimite && (
                  <span className="text-orange-400">⏰ Límite {fechaLimite}</span>
                )}
              </div>
              <span className="text-sm text-zinc-600">Ver detalle →</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
