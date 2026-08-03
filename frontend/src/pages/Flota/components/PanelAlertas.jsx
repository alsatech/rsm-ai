import { ALERTA_TIPO_LABELS, URGENCIA_CONFIG } from '../constants'

const ORDEN_URGENCIA = { critico: 0, proximo: 1, preventivo: 2 }

export default function PanelAlertas({ alertas, loading }) {
  const ordenadas = [...alertas].sort(
    (a, b) => (ORDEN_URGENCIA[a.urgencia] ?? 3) - (ORDEN_URGENCIA[b.urgencia] ?? 3)
  )
  const hayCritica7dias = ordenadas.some((a) => a.urgencia === 'critico')

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-flotafg">Alertas activas</h2>
        {hayCritica7dias && (
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-error" />
        )}
      </div>

      {loading && <p className="text-sm text-flotafg-muted">Cargando…</p>}

      {!loading && ordenadas.length === 0 && (
        <p className="text-sm text-flotafg-muted">Sin alertas activas. 🎉</p>
      )}

      {!loading && ordenadas.length > 0 && (
        <div className="flex flex-col gap-2">
          {ordenadas.map((alerta, idx) => {
            const conf = URGENCIA_CONFIG[alerta.urgencia] ?? URGENCIA_CONFIG.proximo
            return (
              <div
                key={alerta.id}
                style={{ animationDelay: `${idx * 40}ms` }}
                className={`flota-fade-in rounded-xl border px-3 py-2 transition hover:scale-[1.01] ${conf.border} ${conf.bg}`}
              >
                <p className="flex items-center gap-1.5 text-sm font-semibold text-flotafg">
                  <span>{conf.icon}</span>
                  {alerta.vehiculo_detalle?.nombre} — {ALERTA_TIPO_LABELS[alerta.tipo] ?? alerta.tipo}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-flotafg-muted">{alerta.descripcion}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}