import { useCallback, useEffect, useState } from 'react'

import { getAlertasFlota, getVehiculos, resolverAlertaFlota } from '../../../api/flota'
import { useToast } from '../../../hooks/useToast'
import { ALERTA_TIPO_LABELS, URGENCIA_CONFIG } from '../constants'

const ORDEN_URGENCIA = { critico: 0, proximo: 1, preventivo: 2 }

export default function VistaAlertas({ onVolver }) {
  const { showToast } = useToast()
  const [alertas, setAlertas] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroVehiculo, setFiltroVehiculo] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [notasPorAlerta, setNotasPorAlerta] = useState({})

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = { activa: true, resuelta: false }
      if (filtroVehiculo) params.vehiculo = filtroVehiculo
      if (filtroTipo) params.tipo = filtroTipo
      const { data } = await getAlertasFlota(params)
      setAlertas(data)
    } catch {
      showToast('No se pudieron cargar las alertas.', 'error')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroVehiculo, filtroTipo])

  useEffect(() => { cargar() }, [cargar])
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

  const ordenadas = [...alertas].sort(
    (a, b) => (ORDEN_URGENCIA[a.urgencia] ?? 3) - (ORDEN_URGENCIA[b.urgencia] ?? 3)
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
            <h1 className="font-bold text-highlight">Alertas de flota</h1>
            <p className="text-xs text-text-secondary">{ordenadas.length} alerta{ordenadas.length !== 1 ? 's' : ''} activa{ordenadas.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 px-4 py-4">
        <select
          value={filtroVehiculo}
          onChange={(e) => setFiltroVehiculo(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text outline-none focus:border-highlight"
        >
          <option value="">Todos los vehículos</option>
          {vehiculos.map((v) => (
            <option key={v.id} value={v.id}>{v.nombre}</option>
          ))}
        </select>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text outline-none focus:border-highlight"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(ALERTA_TIPO_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3 px-4">
        {loading && <p className="text-center text-sm text-text-secondary">Cargando…</p>}

        {!loading && ordenadas.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">🎉</span>
            <p className="text-text-secondary">No hay alertas activas.</p>
          </div>
        )}

        {!loading && ordenadas.map((alerta) => {
          const conf = URGENCIA_CONFIG[alerta.urgencia] ?? URGENCIA_CONFIG.proximo
          return (
            <div key={alerta.id} className={`rounded-2xl border-2 bg-card p-4 ${conf.border}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${conf.text} ${conf.bg}`}>
                    {conf.icon} {conf.label}
                  </span>
                  <p className="mt-1.5 font-bold text-text">
                    {alerta.vehiculo_detalle?.nombre} — {ALERTA_TIPO_LABELS[alerta.tipo] ?? alerta.tipo}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">{alerta.descripcion}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={notasPorAlerta[alerta.id] ?? ''}
                  onChange={(e) => setNotasPorAlerta((prev) => ({ ...prev, [alerta.id]: e.target.value }))}
                  placeholder="Notas de resolución (opcional)"
                  className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-highlight"
                />
                <button
                  type="button"
                  onClick={() => handleResolver(alerta.id)}
                  style={{ minHeight: '44px' }}
                  className="rounded-lg border border-highlight px-4 text-sm font-bold text-highlight transition hover:bg-highlight hover:text-bg"
                >
                  Resolver alerta
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
