import { useEffect, useState } from 'react'

import { getResumenGanado } from '../../../api/ganado'
import { ESTADO_CONFIG } from './colorConfig'

export default function ResumenGanado() {
  const [resumen, setResumen] = useState(null)

  useEffect(() => {
    getResumenGanado()
      .then(({ data }) => setResumen(data))
      .catch(() => {})
  }, [])

  if (!resumen) return null

  const { ultimo_recorrido: ultimo, total_mes, alertas_mes } = resumen

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-text">🐄 Ganado</p>
        <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-mono text-highlight">
          {total_mes} este mes
        </span>
      </div>

      {alertas_mes > 0 && (
        <div className="mb-3 rounded-xl border border-error bg-bg px-3 py-2 text-xs text-error">
          ⚠️ {alertas_mes} alerta{alertas_mes > 1 ? 's' : ''} este mes
        </div>
      )}

      {ultimo ? (
        <div className="space-y-1">
          <p className="text-xs text-text-secondary">Último recorrido</p>
          <p className="text-sm font-semibold text-text">{ultimo.responsable}</p>
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-text-secondary">{ultimo.fecha}</p>
            {ultimo.estado_hato && (
              <span
                className={`text-xs font-semibold ${ESTADO_CONFIG[ultimo.estado_hato]?.text ?? 'text-text'}`}
              >
                {ESTADO_CONFIG[ultimo.estado_hato]?.icon} {ESTADO_CONFIG[ultimo.estado_hato]?.label}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-text-secondary">Sin recorridos este mes.</p>
      )}
    </div>
  )
}
