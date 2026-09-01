import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getResumenProyectos } from '../../../api/proyectos'
import { useAuth } from '../../../hooks/useAuth'

const ROLES_VISIBLES = ['operaciones', 'administrador', 'superadmin']

export default function ResumenProyectos() {
  const { user } = useAuth()
  const [resumen, setResumen] = useState(null)
  const puedeVer = ROLES_VISIBLES.includes(user?.rol)

  useEffect(() => {
    if (!puedeVer) return
    getResumenProyectos().then(({ data }) => setResumen(data)).catch(() => setResumen(null))
  }, [puedeVer])

  if (!puedeVer || !resumen) return null

  return (
    <Link
      to="/proyectos"
      className="block rounded-2xl border border-border bg-card p-4 transition hover:border-accent"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-text">🏗️ Proyectos</p>
        <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-mono text-highlight">
          {resumen.total} total
        </span>
      </div>

      {resumen.pendientes_autorizacion > 0 && (
        <div className="mb-2 animate-pulse rounded-xl border border-error/50 bg-error/10 px-3 py-2 text-xs font-semibold text-error">
          ⚠️ {resumen.pendientes_autorizacion} proyecto{resumen.pendientes_autorizacion !== 1 ? 's' : ''} pendiente{resumen.pendientes_autorizacion !== 1 ? 's' : ''} de autorización
        </div>
      )}

      <div className="space-y-1 text-xs text-text-secondary">
        <p>🔨 {resumen.en_progreso} en progreso</p>
        <p>✅ {resumen.completados_mes} completado{resumen.completados_mes !== 1 ? 's' : ''} este mes</p>
      </div>
    </Link>
  )
}
