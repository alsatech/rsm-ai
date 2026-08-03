import { ESTADO_VEHICULO_CONFIG, TIPO_ICONOS, esOffRoad } from '../constants'

function formatFechaHora(fechaHora) {
  if (!fechaHora) return ''
  const d = new Date(fechaHora)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

// Vista en lista — solo texto. La foto y los detalles grandes se muestran al
// entrar al detalle del vehículo.
export default function TarjetaVehiculo({ vehiculo, onVerDetalle, onNuevoChecklist, puedeCrearChecklist }) {
  const estadoConfig = ESTADO_VEHICULO_CONFIG[vehiculo.estado] ?? ESTADO_VEHICULO_CONFIG.activo
  const ultimo = vehiculo.ultimo_checklist
  const unidad = esOffRoad(vehiculo.tipo) ? 'hrs' : 'km'
  const tipoLabel = TIPO_ICONOS[vehiculo.tipo] ? vehiculo.tipo : 'vehículo'
  const tipoLabelCapitalizado = tipoLabel.charAt(0).toUpperCase() + tipoLabel.slice(1)

  return (
    <div className="glass-card flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]">
      <button
        type="button"
        onClick={onVerDetalle}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-flotabg/70 text-2xl">
          {TIPO_ICONOS[vehiculo.tipo] ?? '🚗'}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-bold leading-tight text-flotafg">
              {vehiculo.nombre}
            </p>
            {vehiculo.alertas_activas_count > 0 && (
              <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-error px-1.5 text-[11px] font-bold text-white flota-pulse">
                {vehiculo.alertas_activas_count}
              </span>
            )}
          </div>
          <p className="truncate text-sm text-flotafg-muted">
            {vehiculo.marca} {vehiculo.modelo}{vehiculo.anio ? ` · ${vehiculo.anio}` : ''}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${estadoConfig.border} ${estadoConfig.text} ${estadoConfig.bg}`}
            >
              {estadoConfig.label}
            </span>
            <span className="font-mono text-xs text-flotafg-muted">
              {Number(vehiculo.kilometraje_actual).toLocaleString('es-MX')} {unidad}
            </span>
            {vehiculo.placas && (
              <span className="font-mono text-[11px] uppercase tracking-wide text-flotafg-muted">
                · {vehiculo.placas}
              </span>
            )}
          </div>
          {ultimo ? (
            <p className="mt-1 text-xs text-flotafg-muted">
              Último: {ultimo.tipo_reporte === 'salida' ? '🚗 Salida' : '🏁 Llegada'} — {ultimo.responsable} · {formatFechaHora(ultimo.fecha_hora)}
              {!ultimo.validado && <span className="ml-1 text-warning">· sin validar</span>}
              {ultimo.items_verificados < ultimo.total_items && (
                <span className="ml-1 font-semibold text-error">· ítems faltantes ({ultimo.items_verificados}/{ultimo.total_items})</span>
              )}
            </p>
          ) : (
            <p className="mt-1 text-xs italic text-flotafg-muted">Sin checklists registrados.</p>
          )}
        </div>
      </button>

      {puedeCrearChecklist && (
        <button
          type="button"
          onClick={onNuevoChecklist}
          style={{ minHeight: '48px' }}
          className="flota-cta-primary shrink-0 rounded-xl px-4 py-2.5 text-sm"
        >
          + Checklist
        </button>
      )}
    </div>
  )
}
