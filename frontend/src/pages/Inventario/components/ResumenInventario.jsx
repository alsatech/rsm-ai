import { useEffect, useState } from 'react'

import { getResumenInventario } from '../../../api/inventario'
import { useAuth } from '../../../hooks/useAuth'

const ROLES_VISIBLES = ['inventario', 'administrador', 'superadmin']

export default function ResumenInventario({ recargar }) {
  const { user } = useAuth()
  const [resumen, setResumen] = useState(null)
  const puedeVer = ROLES_VISIBLES.includes(user?.rol)

  useEffect(() => {
    if (!puedeVer) return
    getResumenInventario()
      .then(({ data }) => setResumen(data))
      .catch(() => setResumen(null))
  }, [puedeVer, recargar])

  if (!puedeVer || !resumen) return null

  const { total_productos, alertas_stock, movimientos_hoy, entradas_sin_validar } = resumen

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-text">📦 Inventario</p>
        <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-mono text-highlight">
          {total_productos} productos
        </span>
      </div>

      {entradas_sin_validar > 0 && (
        <div className="mb-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          ⚠️ {entradas_sin_validar} entrada{entradas_sin_validar !== 1 ? 's' : ''} sin validar
        </div>
      )}

      <div className="space-y-1 text-xs text-text-secondary">
        <p>🔴 {alertas_stock} producto{alertas_stock !== 1 ? 's' : ''} en alerta de stock</p>
        <p>🔄 {movimientos_hoy} movimiento{movimientos_hoy !== 1 ? 's' : ''} hoy</p>
      </div>
    </div>
  )
}
