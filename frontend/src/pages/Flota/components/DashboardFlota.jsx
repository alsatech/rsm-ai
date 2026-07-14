import { useCallback, useEffect, useState } from 'react'

import { createVehiculo, getAlertasFlota, getResumenFlota, getVehiculos } from '../../../api/flota'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import FormularioVehiculo from './FormularioVehiculo'
import PanelAlertas from './PanelAlertas'
import TarjetaVehiculo from './TarjetaVehiculo'

export default function DashboardFlota({ recargar, onVerVehiculo, onNuevoChecklist, onVehiculoCreado }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [vehiculos, setVehiculos] = useState([])
  const [alertas, setAlertas] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingAlertas, setLoadingAlertas] = useState(true)
  const [error, setError] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const puedeCrearChecklist = ['campo', 'administrador', 'superadmin'].includes(user?.rol)
  const puedeGestionarVehiculo = ['operaciones', 'superadmin'].includes(user?.rol)
  const puedeVerAlertas = ['administrador', 'superadmin'].includes(user?.rol)

  const cargarVehiculos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getVehiculos()
      setVehiculos(data)
    } catch {
      setError('No se pudo cargar la flota.')
    } finally {
      setLoading(false)
    }
  }, [])

  const cargarAlertas = useCallback(async () => {
    if (!puedeVerAlertas) {
      setLoadingAlertas(false)
      return
    }
    setLoadingAlertas(true)
    try {
      const { data } = await getAlertasFlota({ activa: true, resuelta: false })
      setAlertas(data)
    } finally {
      setLoadingAlertas(false)
    }
  }, [puedeVerAlertas])

  const cargarResumen = useCallback(async () => {
    if (!puedeVerAlertas) return
    try {
      const { data } = await getResumenFlota()
      setResumen(data)
    } catch {
      setResumen(null)
    }
  }, [puedeVerAlertas])

  useEffect(() => { cargarVehiculos() }, [cargarVehiculos, recargar])
  useEffect(() => { cargarAlertas() }, [cargarAlertas, recargar])
  useEffect(() => { cargarResumen() }, [cargarResumen, recargar])

  const handleCrearVehiculo = async (formData) => {
    setGuardando(true)
    try {
      await createVehiculo(formData)
      showToast('✅ Vehículo creado', 'exito')
      setMostrarFormulario(false)
      cargarVehiculos()
      onVehiculoCreado?.()
    } catch {
      showToast('No se pudo crear el vehículo.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
      <div>
        {puedeGestionarVehiculo && (
          <button
            type="button"
            onClick={() => setMostrarFormulario(true)}
            style={{ minHeight: '52px' }}
            className="mb-4 w-full rounded-xl border-2 border-dashed border-accent text-sm font-semibold text-highlight transition hover:bg-card sm:w-auto sm:px-6"
          >
            + Nuevo vehículo
          </button>
        )}

        {loading && <p className="text-center text-sm text-text-secondary">Cargando flota…</p>}

        {!loading && error && <p className="text-center text-sm text-error">{error}</p>}

        {!loading && !error && vehiculos.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">🚚</span>
            <p className="text-text-secondary">No hay vehículos registrados todavía.</p>
          </div>
        )}

        {!loading && !error && vehiculos.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {vehiculos.map((vehiculo) => (
              <TarjetaVehiculo
                key={vehiculo.id}
                vehiculo={vehiculo}
                puedeCrearChecklist={puedeCrearChecklist}
                onVerDetalle={() => onVerVehiculo(vehiculo.id)}
                onNuevoChecklist={() => onNuevoChecklist(vehiculo)}
              />
            ))}
          </div>
        )}
      </div>

      {puedeVerAlertas && (
        <div className="flex flex-col gap-4">
          {resumen?.checklists_sin_validar > 0 && (
            <div className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3">
              <p className="text-sm font-semibold text-warning">
                ⚠️ {resumen.checklists_sin_validar} checklist{resumen.checklists_sin_validar !== 1 ? 's' : ''} sin validar
              </p>
            </div>
          )}
          <PanelAlertas alertas={alertas} loading={loadingAlertas} />
        </div>
      )}

      {mostrarFormulario && (
        <FormularioVehiculo
          onGuardar={handleCrearVehiculo}
          onCancelar={() => setMostrarFormulario(false)}
          guardando={guardando}
        />
      )}
    </div>
  )
}
