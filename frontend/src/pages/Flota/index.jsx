import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getResumenFlota } from '../../api/flota'
import { useAuth } from '../../hooks/useAuth'
import DashboardFlota from './components/DashboardFlota'
import DetalleVehiculo from './components/DetalleVehiculo'
import FlotaLayout from './components/FlotaLayout'
import HistorialIncidencias from './components/HistorialIncidencias'
import VistaAlertas from './components/VistaAlertas'
import WizardChecklist from './components/WizardChecklist'

export default function Flota() {
  const { user } = useAuth()
  const [vista, setVista] = useState('dashboard')
  const [vehiculoId, setVehiculoId] = useState(null)
  const [vehiculoPreseleccionado, setVehiculoPreseleccionado] = useState(null)
  const [recargar, setRecargar] = useState(0)
  const [resumen, setResumen] = useState(null)

  const puedeVerAlertas = ['administrador', 'superadmin'].includes(user?.rol)

  const cargarResumen = useCallback(async () => {
    if (!puedeVerAlertas) return
    try {
      const { data } = await getResumenFlota()
      setResumen(data)
    } catch {
      setResumen(null)
    }
  }, [puedeVerAlertas])

  useEffect(() => {
    cargarResumen()
  }, [cargarResumen, recargar])

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

  const alertasActivas = resumen?.alertas_activas ?? 0
  const alertasCriticas = resumen?.alertas_criticas ?? 0
  const sinValidar = resumen?.checklists_sin_validar ?? 0

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
    // DetalleVehiculo ya tiene su propio header visual interno. Para no duplicar,
    // lo renderizamos sin header externo (FlotaLayout solo provee fondo + contenedores).
    return (
      <FlotaLayout>
        <DetalleVehiculo id={vehiculoId} onVolver={handleVolver} onNuevoChecklist={handleNuevoChecklist} />
      </FlotaLayout>
    )
  }

  if (vista === 'alertas' && puedeVerAlertas) {
    return <VistaAlertas onVolver={handleVolver} onVerVehiculo={handleVerVehiculo} />
  }

  if (vista === 'incidencias' && puedeVerAlertas) {
    return <HistorialIncidencias onVolver={handleVolver} />
  }

  const dashboardHeader = (
    <>
      <Link
        to="/dashboard"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-flotafg-muted/30 text-flotafg-muted transition hover:scale-105 hover:border-accent hover:text-flotafg"
      >
        ←
      </Link>
      <div className="flex-1">
        <h1 className="font-bold text-flotafg">Flota</h1>
        <p className="text-xs text-flotafg-muted">Checklists y mantenimiento de vehículos</p>
      </div>

      {puedeVerAlertas && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVista('incidencias')}
            className="glass-card flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-flotafg transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
          >
            ⚠️ Incidencias
          </button>
          <button
            type="button"
            onClick={() => setVista('alertas')}
            className="glass-card relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-flotafg transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
          >
            <span>🔔 Alertas</span>
            {alertasActivas > 0 && (
              <span
                className={`absolute -right-2 -top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                  alertasCriticas > 0
                    ? 'animate-pulse bg-error text-white'
                    : 'bg-warning text-flotabg'
                }`}
              >
                {alertasActivas}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setVista('alertas')}
            className="glass-card relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-flotafg transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
          >
            <span>📋 Sin validar</span>
            {sinValidar > 0 && (
              <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-warning px-1.5 text-[11px] font-bold text-flotabg">
                {sinValidar}
              </span>
            )}
          </button>
        </div>
      )}
    </>
  )

  return (
    <FlotaLayout headerContent={dashboardHeader}>
      <DashboardFlota
        recargar={recargar}
        onVerVehiculo={handleVerVehiculo}
        onNuevoChecklist={handleNuevoChecklist}
        onVerSinValidar={() => setVista('alertas')}
        onVerIncidencias={() => setVista('incidencias')}
        onVehiculoCreado={() => setRecargar((r) => r + 1)}
      />
    </FlotaLayout>
  )
}
