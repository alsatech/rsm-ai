import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import DashboardFlota from './components/DashboardFlota'
import DetalleVehiculo from './components/DetalleVehiculo'
import VistaAlertas from './components/VistaAlertas'
import WizardChecklist from './components/WizardChecklist'

export default function Flota() {
  const { user } = useAuth()
  const [vista, setVista] = useState('dashboard')
  const [vehiculoId, setVehiculoId] = useState(null)
  const [vehiculoPreseleccionado, setVehiculoPreseleccionado] = useState(null)
  const [recargar, setRecargar] = useState(0)

  const puedeVerAlertas = ['administrador', 'superadmin'].includes(user?.rol)

  const handleVerVehiculo = (id) => {
    setVehiculoId(id)
    setVista('detalle')
  }

  const handleNuevoChecklist = (vehiculo = null) => {
    setVehiculoPreseleccionado(vehiculo)
    setVista('nuevo-checklist')
  }

  const handleVolver = () => {
    setVista('dashboard')
    setVehiculoId(null)
    setVehiculoPreseleccionado(null)
  }

  const handleGuardado = () => {
    setVista('dashboard')
    setVehiculoPreseleccionado(null)
    setRecargar((r) => r + 1)
  }

  if (vista === 'nuevo-checklist') {
    return (
      <WizardChecklist
        vehiculoPreseleccionado={vehiculoPreseleccionado}
        onVolver={handleVolver}
        onGuardado={handleGuardado}
      />
    )
  }

  if (vista === 'detalle' && vehiculoId) {
    return (
      <DetalleVehiculo
        id={vehiculoId}
        onVolver={handleVolver}
        onNuevoChecklist={() => handleNuevoChecklist({ id: vehiculoId })}
      />
    )
  }

  if (vista === 'alertas' && puedeVerAlertas) {
    return <VistaAlertas onVolver={handleVolver} />
  }

  return (
    <div className="min-h-svh bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
            >
              ←
            </Link>
            <div>
              <h1 className="font-bold text-highlight">Flota</h1>
              <p className="text-xs text-text-secondary">Checklists y mantenimiento de vehículos</p>
            </div>
          </div>

          {puedeVerAlertas && (
            <button
              type="button"
              onClick={() => setVista('alertas')}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text"
            >
              🔔 Alertas
            </button>
          )}
        </div>
      </header>

      <DashboardFlota
        recargar={recargar}
        onVerVehiculo={handleVerVehiculo}
        onNuevoChecklist={handleNuevoChecklist}
        onVehiculoCreado={() => setRecargar((r) => r + 1)}
      />
    </div>
  )
}
