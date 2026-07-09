import { useEffect, useState } from 'react'

import { getResumenFlota } from '../../../api/flota'

export default function ResumenFlota() {
  const [resumen, setResumen] = useState(null)

  useEffect(() => {
    getResumenFlota()
      .then(({ data }) => setResumen(data))
      .catch(() => {})
  }, [])

  if (!resumen) return null

  const { vehiculos_activos, alertas_activas, alertas_criticas, vehiculos_sin_checklist_48h } = resumen

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-text">🚚 Flota</p>
        <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-mono text-highlight">
          {vehiculos_activos} activos
        </span>
      </div>

      {alertas_criticas > 0 && (
        <div className="mb-2 rounded-xl border border-error bg-bg px-3 py-2 text-xs text-error">
          🔴 {alertas_criticas} alerta{alertas_criticas > 1 ? 's' : ''} crítica{alertas_criticas > 1 ? 's' : ''}
        </div>
      )}

      <div className="space-y-1 text-xs text-text-secondary">
        <p>⚠️ {alertas_activas} alerta{alertas_activas !== 1 ? 's' : ''} activa{alertas_activas !== 1 ? 's' : ''}</p>
        <p>🕑 {vehiculos_sin_checklist_48h} vehículo{vehiculos_sin_checklist_48h !== 1 ? 's' : ''} sin checklist en 48h</p>
      </div>
    </div>
  )
}
