import { ESTADO_VEHICULO_CONFIG, TIPO_ICONOS } from '../constants'

function formatFechaHora(fechaHora) {
  const d = new Date(fechaHora)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

export default function TarjetaVehiculo({ vehiculo, onVerDetalle, onNuevoChecklist, puedeCrearChecklist }) {
  const estadoConfig = ESTADO_VEHICULO_CONFIG[vehiculo.estado] ?? ESTADO_VEHICULO_CONFIG.activo
  const ultimo = vehiculo.ultimo_checklist

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-4 transition hover:border-accent">
      <button type="button" onClick={onVerDetalle} className="block w-full text-left">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {vehiculo.foto ? (
              <img
                src={vehiculo.foto}
                alt={vehiculo.nombre}
                className="h-14 w-14 rounded-xl border border-border object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-bg text-3xl">
                {TIPO_ICONOS[vehiculo.tipo] ?? '🚗'}
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-highlight">{vehiculo.nombre}</p>
              <p className="text-sm text-text-secondary">
                {vehiculo.marca} {vehiculo.modelo} · {vehiculo.anio}
              </p>
            </div>
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
            {Number(vehiculo.kilometraje_actual).toLocaleString('es-MX')} km
          </span>
        </div>

        {ultimo ? (
          <p className="text-xs text-text-secondary">
            Último: {ultimo.tipo_reporte === 'salida' ? '🚗 Salida' : '🏁 Llegada'} — {ultimo.responsable} ·{' '}
            {formatFechaHora(ultimo.fecha_hora)}
            {!ultimo.validado && <span className="ml-1 text-warning">· sin validar</span>}
          </p>
        ) : (
          <p className="text-xs text-text-secondary">Sin checklists registrados.</p>
        )}
      </button>

      {puedeCrearChecklist && (
        <button
          type="button"
          onClick={onNuevoChecklist}
          style={{ minHeight: '48px' }}
          className="mt-3 w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-highlight transition hover:opacity-90"
        >
          + Nuevo checklist
        </button>
      )}
    </div>
  )
}
