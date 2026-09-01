import { useState } from 'react'

import { autorizarProyecto, rechazarProyecto, updateProyecto } from '../../../../api/proyectos'
import { useAuth } from '../../../../hooks/useAuth'
import { useConfirm } from '../../../../hooks/useConfirm'
import { useToast } from '../../../../hooks/useToast'
import { formatFecha, formatMoneda } from '../../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

const ESTADOS_EDITABLES = [
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
]

function Campo({ label, valor }) {
  if (!valor) return null
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{label}</p>
      <p className="text-sm text-text">{valor}</p>
    </div>
  )
}

export default function TabResumen({ proyecto, onActualizado, onVolver }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const esSuperadmin = user?.rol === 'superadmin'
  const [editando, setEditando] = useState(false)
  const [notas, setNotas] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [form, setForm] = useState({
    observaciones: proyecto.observaciones || '',
    fecha_inicio_real: proyecto.fecha_inicio_real || '',
    fecha_fin_real: proyecto.fecha_fin_real || '',
    estado: proyecto.estado,
  })

  const pendienteAutorizacion = proyecto.requiere_autorizacion && proyecto.estado === 'borrador'

  const handleAutorizar = async () => {
    const confirmado = await confirm({
      titulo: '¿Autorizar este proyecto?',
      mensaje: `${proyecto.folio} quedará autorizado para arrancar.`,
      confirmText: 'Sí, autorizar',
      cancelText: 'Cancelar',
      variante: 'pregunta',
    })
    if (!confirmado) return
    setProcesando(true)
    try {
      await autorizarProyecto(proyecto.id, { notas_autorizacion: notas })
      showToast('✅ Proyecto autorizado', 'exito')
      setNotas('')
      onActualizado()
    } catch {
      showToast('No se pudo autorizar el proyecto.', 'error')
    } finally {
      setProcesando(false)
    }
  }

  const handleRechazar = async () => {
    if (!notas.trim()) {
      showToast('Indica el motivo del rechazo en las notas.', 'alerta')
      return
    }
    const confirmado = await confirm({
      titulo: '¿Rechazar este proyecto?',
      mensaje: notas,
      confirmText: 'Sí, rechazar',
      cancelText: 'Cancelar',
      variante: 'peligro',
    })
    if (!confirmado) return
    setProcesando(true)
    try {
      await rechazarProyecto(proyecto.id, { notas_autorizacion: notas })
      showToast('Proyecto rechazado', 'alerta')
      setNotas('')
      onActualizado()
    } catch {
      showToast('No se pudo rechazar el proyecto.', 'error')
    } finally {
      setProcesando(false)
    }
  }

  const handleGuardarEdicion = async () => {
    setProcesando(true)
    try {
      await updateProyecto(proyecto.id, {
        observaciones: form.observaciones,
        fecha_inicio_real: form.fecha_inicio_real || null,
        fecha_fin_real: form.fecha_fin_real || null,
        estado: form.estado,
      })
      showToast('✅ Proyecto actualizado', 'exito')
      setEditando(false)
      onActualizado()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo actualizar el proyecto.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {pendienteAutorizacion && esSuperadmin && (
        <div className="rounded-2xl border border-warning/50 bg-warning/10 p-5">
          <p className="mb-2 font-bold text-warning">⚠️ Este proyecto requiere tu autorización</p>
          <p className="mb-3 text-sm text-text-secondary">
            Presupuesto de {formatMoneda(proyecto.presupuesto_total)} — supera los $50,000 MXN.
          </p>
          <textarea
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas (obligatorias si rechazas)"
            className={inputClass}
          />
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={handleRechazar}
              disabled={procesando}
              style={{ minHeight: '52px' }}
              className="flex-1 rounded-xl border border-error text-sm font-bold text-error transition hover:bg-error/10 disabled:opacity-50"
            >
              Rechazar
            </button>
            <button
              type="button"
              onClick={handleAutorizar}
              disabled={procesando}
              style={{ minHeight: '52px' }}
              className="flex-1 rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
            >
              Autorizar
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Información del proyecto</p>
          {esSuperadmin && !editando && (
            <button type="button" onClick={() => setEditando(true)} className="text-xs font-semibold text-highlight hover:underline">
              ✏️ Editar
            </button>
          )}
        </div>

        <p className="mb-4 text-sm text-text-secondary">{proyecto.descripcion}</p>

        {!editando && (
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Asignado a" valor={proyecto.asignado_a_detalle?.nombre} />
            <Campo label="Creó" valor={proyecto.creado_por_detalle?.nombre} />
            <Campo label="Presupuesto" valor={proyecto.presupuesto_total ? formatMoneda(proyecto.presupuesto_total) : null} />
            <Campo label="Inicio estimado" valor={formatFecha(proyecto.fecha_inicio_estimada)} />
            <Campo label="Fin estimado" valor={formatFecha(proyecto.fecha_fin_estimada)} />
            <Campo label="Inicio real" valor={formatFecha(proyecto.fecha_inicio_real)} />
            <Campo label="Fin real" valor={formatFecha(proyecto.fecha_fin_real)} />
            {proyecto.autorizado_por_detalle && (
              <Campo
                label="Autorizó"
                valor={`${proyecto.autorizado_por_detalle.nombre} — ${formatFecha(proyecto.autorizado_en)}`}
              />
            )}
          </div>
        )}

        {!editando && proyecto.observaciones && (
          <p className="mt-4 rounded-lg bg-bg px-3 py-2 text-xs text-text-secondary">📝 {proyecto.observaciones}</p>
        )}

        {editando && (
          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="estado_proyecto" className="mb-1 block text-sm font-medium text-text-secondary">
                Estado
              </label>
              <select
                id="estado_proyecto"
                value={form.estado}
                onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                className={inputClass}
              >
                <option value={proyecto.estado} disabled hidden>{proyecto.estado_display}</option>
                {ESTADOS_EDITABLES.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="inicio_real" className="mb-1 block text-sm font-medium text-text-secondary">
                  Inicio real
                </label>
                <input
                  id="inicio_real"
                  type="date"
                  value={form.fecha_inicio_real}
                  onChange={(e) => setForm((f) => ({ ...f, fecha_inicio_real: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="fin_real" className="mb-1 block text-sm font-medium text-text-secondary">
                  Fin real
                </label>
                <input
                  id="fin_real"
                  type="date"
                  value={form.fecha_fin_real}
                  onChange={(e) => setForm((f) => ({ ...f, fecha_fin_real: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="observaciones_proyecto" className="mb-1 block text-sm font-medium text-text-secondary">
                Observaciones
              </label>
              <textarea
                id="observaciones_proyecto"
                rows={3}
                value={form.observaciones}
                onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditando(false)}
                style={{ minHeight: '48px' }}
                className="flex-1 rounded-xl border border-border text-sm text-text-secondary hover:border-text-secondary hover:text-text"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarEdicion}
                disabled={procesando}
                style={{ minHeight: '48px' }}
                className="flex-1 rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
              >
                {procesando ? 'Guardando…' : '💾 Guardar cambios'}
              </button>
            </div>
          </div>
        )}
      </div>

      {proyecto.notas_autorizacion && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">Notas de autorización</p>
          <p className="text-sm text-text-secondary">{proyecto.notas_autorizacion}</p>
        </div>
      )}

      <button
        type="button"
        onClick={onVolver}
        className="py-1 text-center text-sm text-text-secondary hover:text-text"
      >
        ← Volver a proyectos
      </button>
    </div>
  )
}
