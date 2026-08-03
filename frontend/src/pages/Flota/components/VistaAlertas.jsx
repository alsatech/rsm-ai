import { useCallback, useEffect, useState } from 'react'

import { getAlertasFlota, getChecklists, getVehiculos, resolverAlertaFlota } from '../../../api/flota'
import { useToast } from '../../../hooks/useToast'
import { ALERTA_TIPO_LABELS, URGENCIA_CONFIG } from '../constants'

const ORDEN_URGENCIA = { critico: 0, proximo: 1, preventivo: 2 }

function formatFechaHora(fechaHora) {
  return new Date(fechaHora).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function VistaAlertas({ onVolver, onVerVehiculo }) {
  const { showToast } = useToast()
  const [alertas, setAlertas] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [loadingAlertas, setLoadingAlertas] = useState(true)
  const [loadingChecklists, setLoadingChecklists] = useState(true)
  const [filtroVehiculo, setFiltroVehiculo] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [notasPorAlerta, setNotasPorAlerta] = useState({})
  const [checklistsSinValidar, setChecklistsSinValidar] = useState([])

  const cargarAlertas = useCallback(async () => {
    setLoadingAlertas(true)
    try {
      const params = { activa: true, resuelta: false }
      if (filtroVehiculo) params.vehiculo = filtroVehiculo
      if (filtroTipo) params.tipo = filtroTipo
      const { data } = await getAlertasFlota(params)
      setAlertas(data)
    } catch {
      showToast('No se pudieron cargar las alertas.', 'error')
    } finally {
      setLoadingAlertas(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroVehiculo, filtroTipo])

  const cargarChecklists = useCallback(async () => {
    setLoadingChecklists(true)
    try {
      const { data } = await getChecklists({ validado: false })
      setChecklistsSinValidar(data)
    } catch {
      showToast('No se pudieron cargar los checklists pendientes.', 'error')
    } finally {
      setLoadingChecklists(false)
    }
  }, [showToast])

  useEffect(() => { cargarAlertas() }, [cargarAlertas])
  useEffect(() => { cargarChecklists() }, [cargarChecklists])
  useEffect(() => { getVehiculos().then(({ data }) => setVehiculos(data)).catch(() => {}) }, [])

  const handleResolver = async (alertaId) => {
    try {
      await resolverAlertaFlota(alertaId, { notas: notasPorAlerta[alertaId] ?? '' })
      showToast('✅ Alerta resuelta', 'exito')
      setAlertas((prev) => prev.filter((a) => a.id !== alertaId))
    } catch {
      showToast('No se pudo resolver la alerta.', 'error')
    }
  }

  const alertasOrdenadas = [...alertas].sort(
    (a, b) => (ORDEN_URGENCIA[a.urgencia] ?? 3) - (ORDEN_URGENCIA[b.urgencia] ?? 3)
  )

  // Agrupar checklists pendientes por vehículo para navegar al historial.
  const porVehiculo = new Map()
  for (const c of checklistsSinValidar) {
    const id = c.vehiculo
    if (!porVehiculo.has(id)) {
      porVehiculo.set(id, { vehiculo: c.vehiculo_detalle, items: [] })
    }
    porVehiculo.get(id).items.push(c)
  }
  const grupos = Array.from(porVehiculo.values()).sort(
    (a, b) => (a.vehiculo?.nombre ?? '').localeCompare(b.vehiculo?.nombre ?? ''),
  )

  return (
    <div className="min-h-svh bg-flotabg pb-10">
      <header className="sticky top-0 z-20">
        <div className="glass-card-strong flex items-center gap-3 px-4 py-4">
          <button
            type="button"
            onClick={onVolver}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-flotafg-muted/30 text-flotafg-muted transition hover:scale-105 hover:text-flotafg"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-flotafg">Alertas y validaciones</h1>
            <p className="text-xs text-flotafg-muted">
              {alertasOrdenadas.length} alerta{alertasOrdenadas.length !== 1 ? 's' : ''} activa{alertasOrdenadas.length !== 1 ? 's' : ''}
              {' · '}
              {checklistsSinValidar.length} checklist{checklistsSinValidar.length !== 1 ? 's' : ''} por validar
            </p>
          </div>
        </div>
      </header>

      {/* ───── ALERTAS ACTIVAS ───── */}
      <section className="flex flex-col gap-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-flotafg-muted">
            🔔 Alertas activas
          </h2>
          {alertasOrdenadas.length > 0 && (
            <span className="rounded-full bg-error/20 px-2 py-0.5 text-xs font-bold text-error">
              {alertasOrdenadas.length}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={filtroVehiculo}
            onChange={(e) => setFiltroVehiculo(e.target.value)}
            className="glass-card rounded-lg px-3 py-2 text-sm text-flotafg outline-none focus:border-highlight"
          >
            <option value="">Todos los vehículos</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>{v.nombre}</option>
            ))}
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="glass-card rounded-lg px-3 py-2 text-sm text-flotafg outline-none focus:border-highlight"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(ALERTA_TIPO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {loadingAlertas && <p className="text-center text-sm text-flotafg-muted">Cargando alertas…</p>}

        {!loadingAlertas && alertasOrdenadas.length === 0 && (
          <div className="glass-card flex flex-col items-center gap-2 rounded-2xl p-6 text-center">
            <span className="text-4xl">🎉</span>
            <p className="text-sm text-flotafg-muted">No hay alertas activas.</p>
          </div>
        )}

        {!loadingAlertas && alertasOrdenadas.map((alerta, idx) => {
          const conf = URGENCIA_CONFIG[alerta.urgencia] ?? URGENCIA_CONFIG.proximo
          return (
            <div
              key={alerta.id}
              style={{ animationDelay: `${idx * 50}ms` }}
              className={`flota-fade-in glass-card rounded-2xl border-2 p-4 ${conf.border}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${conf.text} ${conf.bg}`}>
                    {conf.icon} {conf.label}
                  </span>
                  <p className="mt-1.5 font-bold text-flotafg">
                    {alerta.vehiculo_detalle?.nombre} — {ALERTA_TIPO_LABELS[alerta.tipo] ?? alerta.tipo}
                  </p>
                  <p className="mt-1 text-sm text-flotafg-muted">{alerta.descripcion}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={notasPorAlerta[alerta.id] ?? ''}
                  onChange={(e) => setNotasPorAlerta((prev) => ({ ...prev, [alerta.id]: e.target.value }))}
                  placeholder="Notas de resolución (opcional)"
                  className="flex-1 rounded-lg border border-flotafg-muted/30 bg-flotabg/60 px-3 py-2 text-sm text-flotafg outline-none transition focus:border-highlight focus:ring-2 focus:ring-highlight/30"
                />
                <button
                  type="button"
                  onClick={() => handleResolver(alerta.id)}
                  style={{ minHeight: '44px' }}
                  className="flota-cta-primary rounded-lg px-4 text-sm"
                >
                  Resolver alerta
                </button>
              </div>
            </div>
          )
        })}
      </section>

      {/* ───── CHECKLISTS SIN VALIDAR ───── */}
      <section className="flex flex-col gap-3 px-4 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-flotafg-muted">
            📋 Checklists sin validar
          </h2>
          {checklistsSinValidar.length > 0 && (
            <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-bold text-warning">
              {checklistsSinValidar.length}
            </span>
          )}
        </div>

        {loadingChecklists && <p className="text-center text-sm text-flotafg-muted">Cargando…</p>}

        {!loadingChecklists && checklistsSinValidar.length === 0 && (
          <div className="glass-card flex flex-col items-center gap-2 rounded-2xl p-6 text-center">
            <span className="text-4xl">✅</span>
            <p className="text-sm text-flotafg-muted">No hay checklists pendientes de validar.</p>
          </div>
        )}

        {!loadingChecklists && grupos.map((grupo, idx) => (
          <button
            key={grupo.vehiculo?.id ?? 'sin-vehiculo'}
            type="button"
            onClick={() => grupo.vehiculo && onVerVehiculo?.(grupo.vehiculo.id)}
            style={{ animationDelay: `${idx * 50}ms` }}
            className="flota-fade-in glass-card rounded-2xl border-2 border-warning/40 p-4 text-left transition hover:-translate-y-0.5 hover:border-warning hover:shadow-lg active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-flotafg">
                  {grupo.vehiculo?.nombre ?? 'Vehículo'}
                </p>
                <p className="text-xs text-flotafg-muted">
                  {grupo.vehiculo?.tipo_display ?? ''} · {grupo.vehiculo?.placas ?? 'sin placas'}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-warning bg-warning/15 px-3 py-1 text-xs font-bold text-warning">
                {grupo.items.length} pendiente{grupo.items.length !== 1 ? 's' : ''}
              </span>
            </div>

            <ul className="mt-3 space-y-1.5">
              {grupo.items.slice(0, 3).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-xs text-flotafg-muted">
                  <span className="flex items-center gap-1.5">
                    {c.tipo_reporte === 'salida' ? '🚗 Salida' : '🏁 Llegada'} ·{' '}
                    {c.responsable_detalle?.nombre ?? '—'}
                    {c.tipo_reporte === 'llegada' && c.salida_relacionada_detalle?.id && (
                      <span className="rounded-full border border-highlight/40 bg-highlight/15 px-1.5 py-0.5 text-[10px] font-bold text-highlight">
                        ↩ #{c.salida_relacionada_detalle.id}
                      </span>
                    )}
                  </span>
                  <span>{formatFechaHora(c.fecha_hora)}</span>
                </li>
              ))}
              {grupo.items.length > 3 && (
                <li className="text-xs font-semibold text-flotafg-muted">
                  + {grupo.items.length - 3} más…
                </li>
              )}
            </ul>

            <p className="mt-3 text-xs font-semibold text-highlight">
              Ver historial del vehículo →
            </p>
          </button>
        ))}
      </section>
    </div>
  )
}
