import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { createPendiente, getPendientes, getResumen } from '../../api/pendientes'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import DetallePendiente from './components/DetallePendiente'
import FormularioPendiente from './components/FormularioPendiente'
import ResumenPendientes from './components/ResumenPendientes'
import VistaListaAdmin from './components/VistaListaAdmin'
import VistaTarjetasCampo from './components/VistaTarjetasCampo'

export default function Pendientes() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const esCampo = user?.rol === 'campo'
  const esAdmin = user?.rol === 'administrador' || user?.rol === 'superadmin'

  const [pendientes, setPendientes] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [vista, setVista] = useState('lista')
  const [pendienteSeleccionadoId, setPendienteSeleccionadoId] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [{ data: lista }, { data: res }] = await Promise.all([
        getPendientes(),
        getResumen(),
      ])
      setPendientes(lista)
      setResumen(res)
    } catch {
      setError('No se pudieron cargar los pendientes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const handleSeleccionar = (pendiente) => {
    setPendienteSeleccionadoId(pendiente.id)
    setVista('detalle')
  }

  const handleVolver = () => {
    setPendienteSeleccionadoId(null)
    setVista('lista')
    cargarDatos()
  }

  const handleNuevo = () => setVista('formulario')

  const handleCancelarFormulario = () => setVista('lista')

  const handleGuardar = async (data) => {
    setGuardando(true)
    try {
      await createPendiente(data)
      showToast('Pendiente creado correctamente.', 'exito')
      setVista('lista')
      await cargarDatos()
    } catch (err) {
      const msg = err.response?.data?.titulo?.[0]
        || err.response?.data?.descripcion?.[0]
        || err.response?.data?.detail
        || 'No se pudo crear el pendiente.'
      showToast(msg, 'error')
      throw err
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-svh bg-bg px-4 py-6 sm:px-8">
      <header className="mb-6">
        <Link to="/dashboard" className="text-sm text-text-secondary hover:text-highlight">
          ← Volver al dashboard
        </Link>
        <h1 className="mt-2 text-xl font-bold text-highlight">Pendientes rastreables</h1>
        <p className="text-sm text-text-secondary">
          {esCampo ? 'Tus pendientes asignados' : 'Seguimiento de pendientes por estado'}
        </p>
      </header>

      {vista === 'lista' && (
        <>
          {esAdmin && resumen && (
            <div className="mb-6">
              <ResumenPendientes resumen={resumen} />
            </div>
          )}

          {loading && (
            <p className="text-text-secondary">Cargando pendientes…</p>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-error/30 bg-error/10 p-4">
              <p className="text-error">{error}</p>
              <button
                onClick={cargarDatos}
                className="mt-2 text-sm text-highlight hover:underline"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {!loading && !error && esAdmin && (
            <VistaListaAdmin
              pendientes={pendientes}
              resumen={resumen}
              onSeleccionar={handleSeleccionar}
              onNuevo={handleNuevo}
            />
          )}

          {!loading && !error && esCampo && (
            <VistaTarjetasCampo
              pendientes={pendientes}
              onSeleccionar={handleSeleccionar}
            />
          )}
        </>
      )}

      {vista === 'formulario' && esAdmin && (
        <FormularioPendiente
          onGuardar={handleGuardar}
          onCancelar={handleCancelarFormulario}
          guardando={guardando}
        />
      )}

      {vista === 'detalle' && pendienteSeleccionadoId && (
        <DetallePendiente
          pendienteId={pendienteSeleccionadoId}
          user={user}
          onVolver={handleVolver}
          onActualizado={cargarDatos}
        />
      )}
    </div>
  )
}
