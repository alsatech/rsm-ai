import { useCallback, useEffect, useState } from 'react'

import {
  getAlertasFlota,
  getHistorialVehiculo,
  getVehiculo,
  resolverAlertaFlota,
  updateVehiculo,
  validarChecklist,
} from '../../../api/flota'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { ALERTA_TIPO_LABELS, ESTADO_VEHICULO_CONFIG, TIPO_ICONOS, TIPO_LABELS } from '../constants'
import DetalleChecklist from './DetalleChecklist'
import FormularioVehiculo from './FormularioVehiculo'
import HistorialChecklists from './HistorialChecklists'

export default function DetalleVehiculo({ id, onVolver, onNuevoChecklist }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [vehiculo, setVehiculo] = useState(null)
  const [checklists, setChecklists] = useState([])
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarEdicion, setMostrarEdicion] = useState(false)
  const [checklistSeleccionado, setChecklistSeleccionado] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const puedeGestionarVehiculo = ['operaciones', 'superadmin'].includes(user?.rol)
  const puedeVerAlertas = ['administrador', 'superadmin'].includes(user?.rol)
  const puedeValidar = ['administrador', 'superadmin'].includes(user?.rol)
  const puedeCrearChecklist = ['campo', 'administrador', 'superadmin'].includes(user?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: v }, { data: hist }] = await Promise.all([
        getVehiculo(id),
        getHistorialVehiculo(id),
      ])
      setVehiculo(v)
      setChecklists(hist)
      if (puedeVerAlertas) {
        const { data: alertasData } = await getAlertasFlota({ vehiculo: id, activa: true, resuelta: false })
        setAlertas(alertasData)
      }
    } catch {
      showToast('No se pudo cargar el vehículo.', 'error')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, puedeVerAlertas])

  useEffect(() => { cargar() }, [cargar])

  const handleEditar = async (formData) => {
    setGuardando(true)
    try {
      await updateVehiculo(id, formData)
      showToast('✅ Vehículo actualizado', 'exito')
      setMostrarEdicion(false)
      cargar()
    } catch {
      showToast('No se pudo actualizar el vehículo.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const handleResolverAlerta = async (alertaId) => {
    try {
      await resolverAlertaFlota(alertaId, {})
      showToast('✅ Alerta resuelta', 'exito')
      setAlertas((prev) => prev.filter((a) => a.id !== alertaId))
    } catch {
      showToast('No se pudo resolver la alerta.', 'error')
    }
  }

  const handleValidarChecklist = async (payload) => {
    if (!checklistSeleccionado) return
    setGuardando(true)
    try {
      await validarChecklist(checklistSeleccionado.id, payload)
      showToast('✅ Checklist validado', 'exito')
      setChecklistSeleccionado(null)
      cargar()
    } catch {
      showToast('No se pudo validar el checklist.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-bg">
        <p className="text-sm text-text-secondary">Cargando vehículo…</p>
      </div>
    )
  }

  if (!vehiculo) return null

  const estadoConfig = ESTADO_VEHICULO_CONFIG[vehiculo.estado] ?? ESTADO_VEHICULO_CONFIG.activo

  return (
    <div className="min-h-svh bg-bg pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVolver}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
            >
              ←
            </button>
            <div>
              <h1 className="font-bold text-highlight">{vehiculo.nombre}</h1>
              <p className="text-xs text-text-secondary">{TIPO_LABELS[vehiculo.tipo]}</p>
            </div>
          </div>
          {puedeGestionarVehiculo && (
            <button
              type="button"
              onClick={() => setMostrarEdicion(true)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text"
            >
              ✏️ Editar
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-5">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-4">
            {vehiculo.foto ? (
              <img src={vehiculo.foto} alt={vehiculo.nombre} className="h-20 w-20 rounded-xl border border-border object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-border bg-bg text-4xl">
                {TIPO_ICONOS[vehiculo.tipo] ?? '🚗'}
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-text">{vehiculo.marca} {vehiculo.modelo} · {vehiculo.anio}</p>
              <p className="text-sm text-text-secondary">{vehiculo.color}{vehiculo.placas ? ` · ${vehiculo.placas}` : ''}</p>
              <span className={`mt-1 inline-block rounded-full border px-3 py-0.5 text-xs font-bold ${estadoConfig.border} ${estadoConfig.text} ${estadoConfig.bg}`}>
                {estadoConfig.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-text-secondary">Kilometraje</p>
              <p className="font-mono font-semibold text-text">{Number(vehiculo.kilometraje_actual).toLocaleString('es-MX')} km</p>
            </div>
            {vehiculo.numero_serie && (
              <div>
                <p className="text-text-secondary">Número de serie</p>
                <p className="font-mono text-text">{vehiculo.numero_serie}</p>
              </div>
            )}
            {vehiculo.uso_asignacion && (
              <div className="col-span-2">
                <p className="text-text-secondary">Uso / asignación</p>
                <p className="text-text">{vehiculo.uso_asignacion}</p>
              </div>
            )}
            {vehiculo.fecha_vencimiento_tenencia && (
              <div>
                <p className="text-text-secondary">Vence tenencia</p>
                <p className="text-text">{vehiculo.fecha_vencimiento_tenencia}</p>
              </div>
            )}
            {vehiculo.fecha_vencimiento_placas && (
              <div>
                <p className="text-text-secondary">Vencen placas</p>
                <p className="text-text">{vehiculo.fecha_vencimiento_placas}</p>
              </div>
            )}
          </div>

          {vehiculo.notas && (
            <p className="mt-3 rounded-lg bg-bg/50 px-3 py-2 text-sm text-text-secondary">{vehiculo.notas}</p>
          )}

          {puedeCrearChecklist && (
            <button
              type="button"
              onClick={onNuevoChecklist}
              style={{ minHeight: '52px' }}
              className="mt-4 w-full rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90"
            >
              + Nuevo checklist
            </button>
          )}
        </div>

        {puedeVerAlertas && alertas.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 font-bold text-text">Alertas activas</h2>
            <div className="flex flex-col gap-2">
              {alertas.map((alerta) => (
                <div key={alerta.id} className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2">
                  <p className="text-sm font-semibold text-text">{ALERTA_TIPO_LABELS[alerta.tipo] ?? alerta.tipo}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{alerta.descripcion}</p>
                  <button
                    type="button"
                    onClick={() => handleResolverAlerta(alerta.id)}
                    className="mt-2 rounded-lg border border-highlight px-3 py-1.5 text-xs font-bold text-highlight transition hover:bg-highlight hover:text-bg"
                  >
                    Marcar como resuelta
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 font-bold text-text">Historial de checklists</h2>
          <HistorialChecklists checklists={checklists} onVerDetalle={setChecklistSeleccionado} />
        </div>
      </div>

      {mostrarEdicion && (
        <FormularioVehiculo
          vehiculo={vehiculo}
          onGuardar={handleEditar}
          onCancelar={() => setMostrarEdicion(false)}
          guardando={guardando}
        />
      )}

      {checklistSeleccionado && (
        <DetalleChecklist
          checklist={checklistSeleccionado}
          puedeValidar={puedeValidar}
          onValidar={handleValidarChecklist}
          guardando={guardando}
          onCerrar={() => setChecklistSeleccionado(null)}
        />
      )}
    </div>
  )
}
