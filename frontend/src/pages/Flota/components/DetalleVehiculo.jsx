import { useCallback, useEffect, useState } from 'react'

import {
  crearAdvertenciaChecklist,
  getAlertasFlota,
  getHistorialVehiculo,
  getVehiculo,
  resolverAlertaFlota,
  updateVehiculo,
  validarChecklist,
} from '../../../api/flota'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { ALERTA_TIPO_LABELS, ESTADO_VEHICULO_CONFIG, TIPO_ICONOS, TIPO_LABELS, esOffRoad } from '../constants'
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

  const handleAgregarAdvertencia = async (motivo) => {
    if (!checklistSeleccionado) return
    setGuardando(true)
    try {
      const { data: advertencia } = await crearAdvertenciaChecklist(checklistSeleccionado.id, { motivo })
      showToast('⚠️ Advertencia agregada', 'exito')
      setChecklistSeleccionado((prev) => ({
        ...prev,
        advertencias: [advertencia, ...(prev.advertencias ?? [])],
      }))
      cargar()
    } catch {
      showToast('No se pudo agregar la advertencia.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-flotabg">
        <p className="text-sm text-flotafg-muted">Cargando vehículo…</p>
      </div>
    )
  }

  if (!vehiculo) return null

  const estadoConfig = ESTADO_VEHICULO_CONFIG[vehiculo.estado] ?? ESTADO_VEHICULO_CONFIG.activo
  const unidad = esOffRoad(vehiculo.tipo) ? 'hrs' : 'km'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onVolver}
          className="flex h-10 w-10 items-center justify-center rounded-full glass-card text-flotafg-muted transition hover:scale-105 hover:text-flotafg"
        >
          ←
        </button>
        {puedeGestionarVehiculo && (
          <button
            type="button"
            onClick={() => setMostrarEdicion(true)}
            className="glass-card rounded-xl px-4 py-2.5 text-sm font-semibold text-flotafg transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
          >
            ✏️ Editar
          </button>
        )}
      </div>

      {/* Alertas activas — ARRIBA para que el admin las vea de inmediato al abrir el vehículo. */}
      {puedeVerAlertas && alertas.length > 0 && (
        <div className="glass-card flota-fade-in rounded-2xl p-4" style={{ animationDelay: '40ms' }}>
          <h2 className="mb-3 font-bold text-flotafg">Alertas activas</h2>
          <div className="flex flex-col gap-2">
            {alertas.map((alerta, idx) => (
              <div
                key={alerta.id}
                style={{ animationDelay: `${idx * 40}ms` }}
                className="flota-fade-in rounded-xl border border-warning/40 bg-warning/10 px-3 py-2"
              >
                <p className="text-sm font-semibold text-flotafg">{ALERTA_TIPO_LABELS[alerta.tipo] ?? alerta.tipo}</p>
                <p className="mt-0.5 text-xs text-flotafg-muted">{alerta.descripcion}</p>
                <button
                  type="button"
                  onClick={() => handleResolverAlerta(alerta.id)}
                  style={{ minHeight: '36px' }}
                  className="flota-cta-primary mt-2 rounded-lg px-3 text-xs"
                >
                  Marcar como resuelta
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card-strong flota-fade-in overflow-hidden rounded-2xl">
        {vehiculo.foto ? (
          <img
            src={vehiculo.foto}
            alt={vehiculo.nombre}
            className="h-72 w-full object-cover sm:h-80"
          />
        ) : (
          <div className="flex h-64 w-full items-center justify-center bg-flotabg text-8xl sm:h-72">
            {TIPO_ICONOS[vehiculo.tipo] ?? '🚗'}
          </div>
        )}

        <div className="p-5 sm:p-6">
          <div className="mb-4">
            <p className="text-3xl font-extrabold leading-tight text-flotafg sm:text-4xl">
              {vehiculo.nombre}
            </p>
            <p className="mt-1 text-lg font-semibold text-flotafg-muted sm:text-xl">
              {vehiculo.marca} {vehiculo.modelo}
              {vehiculo.anio ? <span className="ml-2 text-flotafg-muted/80">· {vehiculo.anio}</span> : null}
            </p>
            <p className="mt-1 text-base text-flotafg-muted">
              {vehiculo.color}
              {vehiculo.placas ? <span className="ml-2 font-mono uppercase tracking-wide">· {vehiculo.placas}</span> : null}
            </p>
            <span className={`mt-3 inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${estadoConfig.border} ${estadoConfig.text} ${estadoConfig.bg}`}>
              {estadoConfig.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-base">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-flotafg-muted">
                {unidad === 'hrs' ? 'Horas (horómetro)' : 'Kilometraje'}
              </p>
              <p className="font-mono text-2xl font-bold text-flotafg">
                {Number(vehiculo.kilometraje_actual).toLocaleString('es-MX')}
                <span className="ml-1 text-sm font-semibold text-flotafg-muted">{unidad}</span>
              </p>
            </div>
            {vehiculo.numero_serie && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-flotafg-muted">Número de serie</p>
                <p className="break-all font-mono text-base text-flotafg">{vehiculo.numero_serie}</p>
              </div>
            )}
            {vehiculo.uso_asignacion && (
              <div className="col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-flotafg-muted">Uso / asignación</p>
                <p className="text-base text-flotafg">{vehiculo.uso_asignacion}</p>
              </div>
            )}
            {vehiculo.fecha_vencimiento_tenencia && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-flotafg-muted">Vence tenencia</p>
                <p className="text-base text-flotafg">{vehiculo.fecha_vencimiento_tenencia}</p>
              </div>
            )}
            {vehiculo.fecha_vencimiento_placas && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-flotafg-muted">Vencen placas</p>
                <p className="text-base text-flotafg">{vehiculo.fecha_vencimiento_placas}</p>
              </div>
            )}
          </div>

          {vehiculo.notas && (
            <p className="mt-4 rounded-lg bg-flotabg px-3 py-2 text-sm text-flotafg-muted">{vehiculo.notas}</p>
          )}

          {puedeCrearChecklist && (
            <button
              type="button"
              onClick={() => onNuevoChecklist(vehiculo)}
              style={{ minHeight: '56px' }}
              className="flota-cta-primary mt-5 w-full rounded-xl text-base"
            >
              + Nuevo checklist
            </button>
          )}
        </div>
      </div>

      <div className="glass-card flota-fade-in rounded-2xl p-4" style={{ animationDelay: '80ms' }}>
        <h2 className="mb-3 font-bold text-flotafg">Historial de checklists</h2>
        <HistorialChecklists checklists={checklists} onVerDetalle={setChecklistSeleccionado} />
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
          onAgregarAdvertencia={handleAgregarAdvertencia}
          guardando={guardando}
          onCerrar={() => setChecklistSeleccionado(null)}
        />
      )}
    </div>
  )
}