import { useCallback, useEffect, useState } from 'react'

import {
  cambiarEstado,
  eliminarFoto,
  getHistorial,
  getPendiente,
  subirFoto,
} from '../../../api/pendientes'
import { useToast } from '../../../hooks/useToast'
import CambiarEstado from './CambiarEstado'
import FotosPendiente from './FotosPendiente'

const BADGE_ESTADO = {
  abierto: 'bg-error/20 text-error',
  en_proceso: 'bg-warning/20 text-warning',
  bloqueado: 'bg-orange-500/20 text-orange-400',
  cerrado: 'bg-highlight/20 text-highlight',
}

const BADGE_PRIORIDAD = {
  baja: 'bg-border text-text-secondary',
  media: 'bg-warning/20 text-warning',
  alta: 'bg-error/20 text-error',
  urgente: 'bg-error text-bg animate-pulse',
}

export default function DetallePendiente({ pendienteId, user, onVolver, onActualizado }) {
  const { showToast } = useToast()
  const esCampo = user?.rol === 'campo'
  const esAdmin = user?.rol === 'administrador' || user?.rol === 'superadmin'

  const [pendiente, setPendiente] = useState(null)
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardandoEstado, setGuardandoEstado] = useState(false)
  const [guardandoFoto, setGuardandoFoto] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: p }, histData] = await Promise.all([
        getPendiente(pendienteId),
        esAdmin ? getHistorial(pendienteId) : Promise.resolve({ data: [] }),
      ])
      setPendiente(p)
      setHistorial(histData.data)
    } catch {
      showToast('No se pudo cargar el pendiente.', 'error')
    } finally {
      setLoading(false)
    }
  }, [pendienteId, esAdmin, showToast])

  useEffect(() => {
    cargar()
  }, [cargar])

  const handleCambiarEstado = async (payload) => {
    setGuardandoEstado(true)
    try {
      await cambiarEstado(pendienteId, payload)
      showToast('Estado actualizado correctamente.', 'exito')
      await cargar()
      if (onActualizado) onActualizado()
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.motivo_bloqueo || 'No se pudo cambiar el estado.'
      showToast(msg, 'error')
    } finally {
      setGuardandoEstado(false)
    }
  }

  const handleSubirFoto = async (formData) => {
    setGuardandoFoto(true)
    try {
      await subirFoto(pendienteId, formData)
      showToast('Foto agregada.', 'exito')
      await cargar()
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0] || 'No se pudo subir la foto.'
      showToast(msg, 'error')
    } finally {
      setGuardandoFoto(false)
    }
  }

  const handleEliminarFoto = async (fotoId) => {
    if (!window.confirm('¿Eliminar esta foto?')) return
    try {
      await eliminarFoto(pendienteId, fotoId)
      showToast('Foto eliminada.', 'exito')
      await cargar()
    } catch {
      showToast('No se pudo eliminar la foto.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-text-secondary">Cargando pendiente…</div>
    )
  }

  if (!pendiente) return null

  const esBloqueado = pendiente.estado === 'bloqueado'
  const esCerrado = pendiente.estado === 'cerrado'

  return (
    <div className="flex flex-col gap-6 pb-8">
      <button
        onClick={onVolver}
        className="self-start text-sm text-text-secondary hover:text-highlight"
      >
        ← Volver a la lista
      </button>

      <div className={`rounded-2xl border p-5 ${esBloqueado ? 'border-orange-500/40 bg-orange-500/5' : 'border-border bg-card'}`}>
        <div className="mb-3 flex flex-wrap items-start gap-2">
          <h2 className="flex-1 text-xl font-bold text-text">{pendiente.titulo}</h2>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${BADGE_ESTADO[pendiente.estado]}`}>
            {pendiente.estado_display}
          </span>
          <span className={`rounded-full px-3 py-1 text-sm ${BADGE_PRIORIDAD[pendiente.prioridad]}`}>
            {pendiente.prioridad_display}
          </span>
        </div>

        {esBloqueado && pendiente.motivo_bloqueo_display && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2">
            <span className="text-orange-400">⚠</span>
            <span className="text-sm font-medium text-orange-300">
              Bloqueado por: {pendiente.motivo_bloqueo_display}
            </span>
          </div>
        )}

        <p className="text-base text-text">{pendiente.descripcion}</p>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <span className="text-text-secondary">Origen: </span>
            <span className="text-text">{pendiente.origen_display}</span>
          </div>
          <div>
            <span className="text-text-secondary">Módulo: </span>
            <span className="text-text">{pendiente.modulo_display}</span>
          </div>
          <div>
            <span className="text-text-secondary">Creado por: </span>
            <span className="text-text">{pendiente.created_by_nombre}</span>
          </div>
          <div>
            <span className="text-text-secondary">Días abierto: </span>
            <span className="text-text">{pendiente.dias_abierto}</span>
          </div>
          {pendiente.fecha_limite && (
            <div>
              <span className="text-text-secondary">Límite: </span>
              <span className="text-text">
                {new Date(pendiente.fecha_limite).toLocaleDateString('es-MX')}
              </span>
            </div>
          )}
          {esCerrado && pendiente.cerrado_por_nombre && (
            <div>
              <span className="text-text-secondary">Cerrado por: </span>
              <span className="text-text">{pendiente.cerrado_por_nombre}</span>
            </div>
          )}
        </div>

        {pendiente.asignado_a_detalle?.length > 0 && (
          <div className="mt-3">
            <span className="text-sm text-text-secondary">Asignado a: </span>
            <span className="text-sm text-text">
              {pendiente.asignado_a_detalle.map((u) => u.nombre).join(', ')}
            </span>
          </div>
        )}
      </div>

      {!esCerrado && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 font-bold text-text">Cambiar estado</h3>
          <CambiarEstado
            estadoActual={pendiente.estado}
            esCampo={esCampo}
            guardando={guardandoEstado}
            onCambiar={handleCambiarEstado}
          />
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <FotosPendiente
          fotos={pendiente.fotos ?? []}
          pendienteId={pendienteId}
          puedeEliminar={esAdmin}
          onSubir={handleSubirFoto}
          onEliminar={handleEliminarFoto}
          guardando={guardandoFoto}
        />
      </div>

      {esAdmin && historial.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 font-bold text-text">Historial de cambios</h3>
          <ol className="relative border-l border-accent">
            {historial.map((h) => (
              <li key={h.id} className="mb-4 ml-4">
                <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-accent bg-bg" />
                <p className="text-sm font-medium text-text">{h.cambio}</p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {h.usuario_nombre} — {new Date(h.fecha).toLocaleString('es-MX')}
                </p>
                {h.nota && (
                  <p className="mt-1 rounded-lg bg-bg px-3 py-2 text-sm text-text-secondary">
                    {h.nota}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
