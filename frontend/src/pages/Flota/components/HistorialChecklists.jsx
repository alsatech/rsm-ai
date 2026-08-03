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
    return <p className="py-6 text-center text-sm text-flotafg-muted">Sin checklists registrados.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por responsable…"
          className="w-full rounded-lg border border-flotafg-muted/30 bg-flotabg/60 px-3 py-2 text-sm text-flotafg outline-none focus:border-highlight"
        />

        <div className="grid grid-cols-2 gap-2">
          <select
            value={responsableId}
            onChange={(e) => setResponsableId(e.target.value)}
            className="rounded-lg border border-flotafg-muted/30 bg-flotabg/60 px-3 py-2 text-sm text-flotafg outline-none focus:border-highlight"
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
              className="flex-1 rounded-lg border border-flotafg-muted/30 px-2 py-2 text-xs font-semibold text-flotafg-muted transition hover:border-highlight hover:text-flotafg active:scale-[0.98]"
            >
              Esta semana
            </button>
            <button
              type="button"
              onClick={() => aplicarSemana(-1)}
              className="flex-1 rounded-lg border border-flotafg-muted/30 px-2 py-2 text-xs font-semibold text-flotafg-muted transition hover:border-highlight hover:text-flotafg active:scale-[0.98]"
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
            className="rounded-lg border border-flotafg-muted/30 bg-flotabg/60 px-3 py-2 text-sm text-flotafg outline-none focus:border-highlight"
          />
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="rounded-lg border border-flotafg-muted/30 bg-flotabg/60 px-3 py-2 text-sm text-flotafg outline-none focus:border-highlight"
          />
        </div>

        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="self-start text-xs text-flotafg-muted underline hover:text-flotafg"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <p className="py-6 text-center text-sm text-flotafg-muted">Sin resultados para estos filtros.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((c, idx) => {
            const incompleto = c.items_verificados < c.total_items
            const esSalida = c.tipo_reporte === 'salida'
            // Una salida sin llegada es la que NO aparece como `salida_relacionada`
            // de ninguna otra checklist del listado.
            const salidaSinCerrar = esSalida && !checklists.some(
              (otro) => otro.salida_relacionada_detalle?.id === c.id,
            )
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onVerDetalle(c)}
                style={{ animationDelay: `${idx * 30}ms` }}
                className="flota-fade-in flex w-full items-center justify-between gap-3 rounded-xl border border-flotafg-muted/20 bg-flotabg/50 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-highlight hover:shadow-md active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-flotafg">
                    {esSalida ? '🚗 Salida' : '🏁 Llegada'} — {c.responsable_detalle?.nombre}
                  </p>
                  <p className="text-xs text-flotafg-muted">
                    {formatFechaHora(c.fecha_hora)}
                    {c.km_reporte != null && (
                      <> · {Number(c.km_reporte).toLocaleString('es-MX')} km</>
                    )} ·{' '}
                    <span className={incompleto ? 'font-semibold text-error' : ''}>
                      {incompleto && '⚠️ '}{c.items_verificados}/{c.total_items} ítems
                    </span>
                    {c.advertencias?.length > 0 && (
                      <span className="ml-1 font-semibold text-warning">· ⚠️ {c.advertencias.length}</span>
                    )}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {!esSalida && c.salida_relacionada_detalle?.id && (
                      <span className="rounded-full border border-highlight/40 bg-highlight/15 px-2 py-0.5 text-[10px] font-bold text-highlight">
                        ↩ Cierra salida #{c.salida_relacionada_detalle.id}
                      </span>
                    )}
                    {salidaSinCerrar && (
                      <span className="rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">
                        ⏳ Sin llegada
                      </span>
                    )}
                  </div>
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
