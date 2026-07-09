function formatFechaHora(fechaHora) {
  return new Date(fechaHora).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function HistorialChecklists({ checklists, onVerDetalle }) {
  if (checklists.length === 0) {
    return <p className="py-6 text-center text-sm text-text-secondary">Sin checklists registrados.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {checklists.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onVerDetalle(c)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-bg px-4 py-3 text-left transition hover:border-accent"
        >
          <div>
            <p className="text-sm font-semibold text-text">
              {c.tipo_reporte === 'salida' ? '🚗 Salida' : '🏁 Llegada'} — {c.responsable_detalle?.nombre}
            </p>
            <p className="text-xs text-text-secondary">
              {formatFechaHora(c.fecha_hora)} · {Number(c.km_reporte).toLocaleString('es-MX')} km ·{' '}
              {c.items_verificados}/{c.total_items} ítems
            </p>
          </div>
          <span className={`shrink-0 text-xs font-bold ${c.validado ? 'text-highlight' : 'text-warning'}`}>
            {c.validado ? '✅ Validado' : '⏳ Pendiente'}
          </span>
        </button>
      ))}
    </div>
  )
}
