import { useCallback, useEffect, useState } from 'react'

import {
  cambiarEstado,
  eliminarFoto,
  eliminarPendiente,
  getHistorial,
  getPendiente,
  subirFoto,
} from '../../../api/pendientes'
import { useConfirm } from '../../../hooks/useConfirm'
import { useToast } from '../../../hooks/useToast'
import { ESTADO, MODULO_ICON, ORIGEN_ICON, PRIORIDAD } from '../estadoConfig'
import CambiarEstado from './CambiarEstado'
import FotosPendiente from './FotosPendiente'

export default function DetallePendiente({ pendienteId, user, onVolver, onActualizado }) {
  const { showToast } = useToast()
  const confirm = useConfirm()
  const esCampo = user?.rol === 'campo'
  const esAdmin = user?.rol === 'administrador' || user?.rol === 'superadmin'
  const esSuperadmin = user?.rol === 'superadmin'

  const [pendiente, setPendiente] = useState(null)
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardandoEstado, setGuardandoEstado] = useState(false)
  const [guardandoFoto, setGuardandoFoto] = useState(false)
  const [eliminando, setEliminando] = useState(false)

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
    const confirmado = await confirm({
      titulo: '¿Eliminar esta foto?',
      mensaje: 'Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar',
      cancelText: 'No, cancelar',
      variante: 'peligro',
    })
    if (!confirmado) return
    try {
      await eliminarFoto(pendienteId, fotoId)
      showToast('Foto eliminada.', 'exito')
      await cargar()
    } catch {
      showToast('No se pudo eliminar la foto.', 'error')
    }
  }

  const handleEliminarPendiente = async () => {
    const confirmado = await confirm({
      titulo: '¿Eliminar este pendiente?',
      mensaje: 'Se eliminará permanentemente junto con su historial y fotos. Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar',
      cancelText: 'No, cancelar',
      variante: 'peligro',
    })
    if (!confirmado) return
    setEliminando(true)
    try {
      await eliminarPendiente(pendienteId)
      showToast('Pendiente eliminado.', 'alerta')
      onVolver()
    } catch {
      showToast('No se pudo eliminar el pendiente.', 'error')
      setEliminando(false)
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
  const conf = ESTADO[pendiente.estado] ?? ESTADO.abierto
  const priConf = PRIORIDAD[pendiente.prioridad] ?? PRIORIDAD.media
  const moduloIcon = MODULO_ICON[pendiente.modulo_relacionado]
  const origenIcon = ORIGEN_ICON[pendiente.origen]

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between">
        <button
          onClick={onVolver}
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Volver a la lista
        </button>
        {esSuperadmin && (
          <button
            onClick={handleEliminarPendiente}
            disabled={eliminando}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            <span>🗑</span>
            <span>{eliminando ? 'Eliminando…' : 'Eliminar'}</span>
          </button>
        )}
      </div>

      {/* Tarjeta principal del pendiente */}
      <div
        style={{ boxShadow: `0 0 24px ${conf.glowRgba}` }}
        className={`rounded-2xl border border-l-4 bg-[#080808] p-5 ${conf.borderColor} ${conf.borderL}`}
      >
        {/* Estado + prioridad */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold ${conf.badge}`}>
            <span>{conf.icon}</span>
            <span>{pendiente.estado_display}</span>
          </span>
          <span className={`rounded-md px-2 py-1 text-xs font-bold ${priConf.badge}`}>
            {priConf.icon} {pendiente.prioridad_display}
          </span>
        </div>

        {/* Bloqueo */}
        {esBloqueado && pendiente.motivo_bloqueo_display && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2">
            <span>⚠</span>
            <span className="text-sm font-medium text-orange-300">
              Bloqueado — {pendiente.motivo_bloqueo_display}
            </span>
          </div>
        )}

        <h2 className="mb-2 text-xl font-bold text-white">{pendiente.titulo}</h2>
        <p className="text-base text-zinc-400">{pendiente.descripcion}</p>

        {/* Info grid */}
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600">Origen</span>
            <span className="ml-1 text-zinc-300">{origenIcon} {pendiente.origen_display}</span>
          </div>
          {pendiente.modulo_relacionado !== 'ninguno' && (
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-600">Módulo</span>
              <span className="ml-1 text-zinc-300">{moduloIcon} {pendiente.modulo_display}</span>
            </div>
          )}
          <div>
            <span className="text-zinc-600">Creado por </span>
            <span className="text-zinc-300">{pendiente.created_by_nombre}</span>
          </div>
          <div>
            <span className="text-zinc-600">📅 </span>
            <span className="text-zinc-300">{pendiente.dias_abierto} días abierto</span>
          </div>
          {pendiente.fecha_asignacion && (
            <div>
              <span className="text-zinc-600">📌 Fecha origen </span>
              <span className="text-zinc-300">
                {new Date(pendiente.fecha_asignacion + 'T00:00:00').toLocaleDateString('es-MX')}
              </span>
            </div>
          )}
          {esCerrado && pendiente.cerrado_por_nombre && (
            <div>
              <span className="text-zinc-600">Cerrado por </span>
              <span className="text-emerald-400">{pendiente.cerrado_por_nombre}</span>
            </div>
          )}
        </div>

        {/* Asignados */}
        {pendiente.asignado_a_detalle?.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-zinc-600">👤 Asignado a</span>
            {pendiente.asignado_a_detalle.map((u) => (
              <span
                key={u.id}
                className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-sm text-zinc-300"
              >
                {u.nombre}
              </span>
            ))}
          </div>
        )}

        {/* Datos de cierre */}
        {esCerrado && pendiente.solucion_cierre && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              ✅ Solución registrada
            </p>
            <p className="text-sm text-zinc-300">{pendiente.solucion_cierre}</p>
            {pendiente.se_compro_material && pendiente.quien_compro && (
              <p className="mt-2 text-sm text-zinc-500">
                🛒 Compra realizada por: <span className="text-zinc-300">{pendiente.quien_compro}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {!esCerrado && (
        <div className="rounded-2xl border border-zinc-800 bg-[#080808] p-5">
          <h3 className="mb-4 font-bold text-white">Cambiar estado</h3>
          <CambiarEstado
            estadoActual={pendiente.estado}
            esCampo={esCampo}
            guardando={guardandoEstado}
            pendienteId={pendiente.id}
            onCambiar={handleCambiarEstado}
          />
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-[#080808] p-5">
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
        <div className="rounded-2xl border border-zinc-800 bg-[#080808] p-5">
          <h3 className="mb-4 font-bold text-white">Historial de cambios</h3>
          <ol className="relative border-l border-zinc-700">
            {historial.map((h) => {
              const hConf = ESTADO[h.estado_nuevo]
              return (
                <li key={h.id} className="mb-5 ml-4">
                  <div
                    className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full border border-zinc-700 ${hConf ? hConf.badge.split(' ')[0] : 'bg-zinc-600'}`}
                  />
                  <p className="text-sm font-medium text-white">{h.cambio}</p>
                  <p className="mt-0.5 text-xs text-zinc-600">
                    {h.usuario_nombre} · {new Date(h.fecha).toLocaleString('es-MX')}
                  </p>
                  {h.nota && (
                    <p className="mt-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-400">
                      {h.nota}
                    </p>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}
