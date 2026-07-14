import { ESTADO_VEHICULO_CONFIG, TIPO_ICONOS, esOffRoad } from '../constants'

function formatFechaHora(fechaHora) {
  const d = new Date(fechaHora)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

export default function TarjetaVehiculo({ vehiculo, onVerDetalle, onNuevoChecklist, puedeCrearChecklist }) {
  const estadoConfig = ESTADO_VEHICULO_CONFIG[vehiculo.estado] ?? ESTADO_VEHICULO_CONFIG.activo
  const ultimo = vehiculo.ultimo_checklist
  const unidad = esOffRoad(vehiculo.tipo) ? 'hrs' : 'km'

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-border bg-card transition hover:border-accent">
      <button type="button" onClick={onVerDetalle} className="block w-full text-left">
        {vehiculo.foto ? (
          <img
            src={vehiculo.foto}
            alt={vehiculo.nombre}
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-bg text-6xl">
            {TIPO_ICONOS[vehiculo.tipo] ?? '🚗'}
          </div>
        )}

        <div className="p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-bold text-highlight">{vehiculo.nombre}</p>
              <p className="text-sm text-text-secondary">
                {vehiculo.marca} {vehiculo.modelo} · {vehiculo.anio}
              </p>
            </div>

            {vehiculo.alertas_activas_count > 0 && (
              <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-error px-2 text-xs font-bold text-white">
                {vehiculo.alertas_activas_count}
              </span>
            )}
          </div>

          <div className="mb-3 flex items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${estadoConfig.border} ${estadoConfig.text} ${estadoConfig.bg}`}
            >
              {estadoConfig.label}
            </span>
            <span className="font-mono text-sm text-text-secondary">
              {Number(vehiculo.kilometraje_actual).toLocaleString('es-MX')} {unidad}
            </span>
          </div>

          {ultimo ? (
            <>
              <p className="text-xs text-text-secondary">
                Último: {ultimo.tipo_reporte === 'salida' ? '🚗 Salida' : '🏁 Llegada'} — {ultimo.responsable} ·{' '}
                {formatFechaHora(ultimo.fecha_hora)}
                {!ultimo.validado && <span className="ml-1 text-warning">· sin validar</span>}
              </p>
              {ultimo.items_verificados < ultimo.total_items && (
                <p className="mt-1 text-xs font-semibold text-error">
                  ⚠️ Ítems faltantes ({ultimo.items_verificados}/{ultimo.total_items})
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-text-secondary">Sin checklists registrados.</p>
          )}
        </div>
      </button>

      {puedeCrearChecklist && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onNuevoChecklist}
            style={{ minHeight: '48px' }}
            className="w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-highlight transition hover:opacity-90"
          >
            + Nuevo checklist
          </button>
        </div>
      )}
    </div>
  )
}
