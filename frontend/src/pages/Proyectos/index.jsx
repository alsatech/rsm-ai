import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import DashboardProyectos from './components/DashboardProyectos'
import DetalleProyecto from './components/DetalleProyecto'

export default function Proyectos() {
  const { user } = useAuth()
  const [vista, setVista] = useState('dashboard') // dashboard | detalle
  const [proyectoId, setProyectoId] = useState(null)
  const [recargar, setRecargar] = useState(0)

  const esSuperadmin = user?.rol === 'superadmin'

  const handleVerProyecto = (id) => {
    setProyectoId(id)
    setVista('detalle')
  }

  const handleVolver = () => {
    setVista('dashboard')
    setProyectoId(null)
    setRecargar((r) => r + 1)
  }

  return (
    <div className="min-h-svh bg-bg pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-bg">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            {vista === 'dashboard' ? (
              <Link
                to="/dashboard"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
              >
                ←
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleVolver}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
              >
                ←
              </button>
            )}
            <div>
              <h1 className="font-bold text-highlight">🏗️ Proyectos</h1>
              <p className="text-xs text-text-secondary">Cotizaciones, compras, avances e inventario propio</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-5">
        {vista === 'dashboard' && (
          <DashboardProyectos
            recargar={recargar}
            esSuperadmin={esSuperadmin}
            onVerProyecto={handleVerProyecto}
          />
        )}

        {vista === 'detalle' && proyectoId && (
          <DetalleProyecto proyectoId={proyectoId} onVolver={handleVolver} />
        )}
      </div>
    </div>
  )
}
