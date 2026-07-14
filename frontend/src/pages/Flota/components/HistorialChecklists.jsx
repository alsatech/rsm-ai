import { useMemo, useState } from 'react'

function formatFechaHora(fechaHora) {
  return new Date(fechaHora).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function toInputDate(d) {
  return d.toISOString().slice(0, 10)
}

function inicioSemana(offsetSemanas) {
  const hoy = new Date()
  const dia = hoy.getDay() // 0 = domingo
  const diff = (dia === 0 ? -6 : 1) - dia // lunes como inicio de semana
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() + diff + offsetSemanas * 7)
  return lunes
}

function finSemana(offsetSemanas) {
  const lunes = inicioSemana(offsetSemanas)
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)
  return domingo
}

export default function HistorialChecklists({ checklists, onVerDetalle }) {
  const [busqueda, setBusqueda] = useState('')
  const [responsableId, setResponsableId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const responsables = useMemo(() => {
    const mapa = new Map()
    checklists.forEach((c) => {
      if (c.responsable_detalle) mapa.set(c.responsable_detalle.id, c.responsable_detalle.nombre)
    })
    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }))
  }, [checklists])

  const aplicarSemana = (offset) => {
    setFechaDesde(toInputDate(inicioSemana(offset)))
    setFechaHasta(toInputDate(finSemana(offset)))
  }

  const limpiarFiltros = () => {
    setBusqueda('')
    setResponsableId('')
    setFechaDesde('')
    setFechaHasta('')
  }

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return checklists.filter((c) => {
      if (texto && !c.responsable_detalle?.nombre?.toLowerCase().includes(texto)) return false
      if (responsableId && String(c.responsable_detalle?.id) !== responsableId) return false
      const fecha = c.fecha_hora?.slice(0, 10)
      if (fechaDesde && fecha < fechaDesde) return false
      if (fechaHasta && fecha > fechaHasta) return false
      return true
    })
  }, [checklists, busqueda, responsableId, fechaDesde, fechaHasta])

  const hayFiltrosActivos = Boolean(busqueda || responsableId || fechaDesde || fechaHasta)

  if (checklists.length === 0) {
    return <p className="py-6 text-center text-sm text-text-secondary">Sin checklists registrados.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por responsable…"
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-highlight"
        />

        <div className="grid grid-cols-2 gap-2">
          <select
            value={responsableId}
            onChange={(e) => setResponsableId(e.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-highlight"
          >
            <option value="">Todos los responsables</option>
            {responsables.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => aplicarSemana(0)}
              className="flex-1 rounded-lg border border-border px-2 py-2 text-xs font-semibold text-text-secondary transition hover:border-accent hover:text-text"
            >
              Esta semana
            </button>
            <button
              type="button"
              onClick={() => aplicarSemana(-1)}
              className="flex-1 rounded-lg border border-border px-2 py-2 text-xs font-semibold text-text-secondary transition hover:border-accent hover:text-text"
            >
              Semana pasada
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-highlight"
          />
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-highlight"
          />
        </div>

        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="self-start text-xs text-text-secondary underline hover:text-text"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-secondary">Sin resultados para estos filtros.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((c) => {
            const incompleto = c.items_verificados < c.total_items
            return (
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
                    <span className={incompleto ? 'font-semibold text-error' : ''}>
                      {incompleto && '⚠️ '}{c.items_verificados}/{c.total_items} ítems
                    </span>
                    {c.advertencias?.length > 0 && (
                      <span className="ml-1 font-semibold text-warning">· ⚠️ {c.advertencias.length}</span>
                    )}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-bold ${c.validado ? 'text-highlight' : 'text-warning'}`}>
                  {c.validado ? '✅ Validado' : '⏳ Pendiente'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
