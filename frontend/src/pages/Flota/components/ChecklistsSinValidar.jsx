import { useCallback, useEffect, useState } from 'react'

import { getChecklists } from '../../../api/flota'
import { useToast } from '../../../hooks/useToast'

function formatFechaHora(fechaHora) {
  return new Date(fechaHora).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function ChecklistsSinValidar({ onVolver, onVerVehiculo }) {
  const { showToast } = useToast()
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getChecklists({ validado: false })
      setChecklists(data)
    } catch {
      showToast('No se pudieron cargar los checklists pendientes.', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { cargar() }, [cargar])

  // Agrupar por vehículo para que el admin los vea juntos y navegue al historial del vehículo.
  const porVehiculo = new Map()
  for (const c of checklists) {
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
    <div className="min-h-svh bg-bg pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="font-bold text-highlight">Checklists sin validar</h1>
            <p className="text-xs text-text-secondary">
              {checklists.length} pendiente{checklists.length !== 1 ? 's' : ''} · toca un vehículo para ver su historial
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4 py-5">
        {loading && <p className="text-center text-sm text-text-secondary">Cargando…</p>}

        {!loading && checklists.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">✅</span>
            <p className="text-text-secondary">No hay checklists pendientes de validar.</p>
          </div>
        )}

        {!loading && grupos.map((grupo) => (
          <button
            key={grupo.vehiculo?.id ?? 'sin-vehiculo'}
            type="button"
            onClick={() => grupo.vehiculo && onVerVehiculo(grupo.vehiculo.id)}
            className="rounded-2xl border-2 border-warning/40 bg-card p-4 text-left transition hover:border-warning"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-text">
                  {grupo.vehiculo?.nombre ?? 'Vehículo'}
                </p>
                <p className="text-xs text-text-secondary">
                  {grupo.vehiculo?.tipo_display ?? ''} · {grupo.vehiculo?.placas ?? 'sin placas'}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-warning bg-warning/10 px-3 py-1 text-xs font-bold text-warning">
                {grupo.items.length} pendiente{grupo.items.length !== 1 ? 's' : ''}
              </span>
            </div>

            <ul className="mt-3 space-y-1.5">
              {grupo.items.slice(0, 3).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-xs text-text-secondary">
                  <span>
                    {c.tipo_reporte === 'salida' ? '🚗 Salida' : '🏁 Llegada'} ·{' '}
                    {c.responsable_detalle?.nombre ?? '—'}
                  </span>
                  <span>{formatFechaHora(c.fecha_hora)}</span>
                </li>
              ))}
              {grupo.items.length > 3 && (
                <li className="text-xs font-semibold text-text-secondary">
                  + {grupo.items.length - 3} más…
                </li>
              )}
            </ul>

            <p className="mt-3 text-xs font-semibold text-highlight">
              Ver historial del vehículo →
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
