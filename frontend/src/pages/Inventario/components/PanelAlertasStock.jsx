import { UBICACION_LABELS } from '../constants'

export default function PanelAlertasStock({ alertas }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 font-bold text-text">⚠️ Alertas de stock mínimo</h2>

      {alertas.length === 0 && (
        <p className="text-sm text-text-secondary">Sin productos en alerta. 🎉</p>
      )}

      {alertas.length > 0 && (
        <div className="flex flex-col gap-2">
          {alertas.map((producto) => {
            const critico = Number(producto.stock_actual) <= 0
            return (
              <div
                key={producto.id}
                className={`rounded-xl border px-3 py-2 ${critico ? 'border-error bg-error/10' : 'border-warning bg-warning/10'}`}
              >
                <p className="flex items-center gap-1.5 text-sm font-semibold text-text">
                  <span>{critico ? '🔴' : '🟡'}</span>
                  {producto.codigo} — {producto.descripcion}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Stock: {producto.stock_actual} / mín. {producto.stock_minimo} · {UBICACION_LABELS[producto.ubicacion_detalle?.nombre]}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
