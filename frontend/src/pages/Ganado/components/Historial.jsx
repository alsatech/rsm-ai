import { useCallback, useEffect, useState } from 'react'

import { getRecorridos } from '../../../api/ganado'
import { useAuth } from '../../../hooks/useAuth'
import { ESTADO_CONFIG } from './colorConfig'
import TarjetaRecorrido from './TarjetaRecorrido'

function agruparPorFecha(recorridos) {
  const mapa = {}
  for (const r of recorridos) {
    if (!mapa[r.fecha]) mapa[r.fecha] = []
    mapa[r.fecha].push(r)
  }
  return Object.entries(mapa).sort(([a], [b]) => (a < b ? 1 : -1))
}

function formatFechaGrupo(fecha) {
  const [y, m, d] = fecha.split('-')
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${d} ${meses[parseInt(m) - 1]} ${y}`
}

export default function Historial({ recargar, onVerDetalle, onNuevo }) {
  const { user } = useAuth()
  const [recorridos, setRecorridos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const esCampo = user?.rol === 'campo'

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getRecorridos()
      setRecorridos(data)
    } catch {
      setError('No se pudo cargar el historial.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar, recargar])

  const grupos = agruparPorFecha(recorridos)

  const alertasHoy = recorridos.filter(
    (r) =>
      r.fecha === new Date().toISOString().split('T')[0] &&
      (r.estado_hato === 'alerta' || r.estado_hato === 'critico'),
  )

  return (
    <div className="px-4 py-6">
      {/* Alertas del día */}
      {alertasHoy.length > 0 && (
        <div className="mb-4 rounded-xl border border-error bg-card px-4 py-3">
          <p className="text-sm font-semibold text-error">
            ⚠️ {alertasHoy.length} recorrido{alertasHoy.length > 1 ? 's' : ''} con alerta hoy
          </p>
          {alertasHoy.map((r) => (
            <p key={r.id} className="mt-1 text-xs text-text-secondary">
              {ESTADO_CONFIG[r.estado_hato].icon} {r.responsable_detalle?.nombre}
            </p>
          ))}
        </div>
      )}

      {loading && (
        <p className="text-center text-sm text-text-secondary">Cargando...</p>
      )}

      {!loading && error && (
        <p className="text-center text-sm text-error">{error}</p>
      )}

      {!loading && !error && recorridos.length === 0 && (
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🐄</span>
          <p className="text-text-secondary">
            {esCampo
              ? 'No tienes recorridos registrados aún.'
              : 'No hay recorridos registrados.'}
          </p>
          <button
            type="button"
            onClick={onNuevo}
            className="mt-2 rounded-2xl bg-accent px-6 py-3 font-semibold text-highlight"
          >
            + Registrar primer recorrido
          </button>
        </div>
      )}

      {!loading && grupos.length > 0 && (
        <div className="space-y-6">
          {grupos.map(([fecha, lista]) => (
            <div key={fecha}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {formatFechaGrupo(fecha)}
                {lista.length > 1 && (
                  <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs">
                    {lista.length} recorridos
                  </span>
                )}
              </p>
              <div className="space-y-3">
                {lista.map((r) => (
                  <TarjetaRecorrido
                    key={r.id}
                    recorrido={r}
                    onClick={() => onVerDetalle(r.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
