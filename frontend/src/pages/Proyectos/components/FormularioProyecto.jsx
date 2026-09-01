import { useEffect, useState } from 'react'

import { createProyecto, getUsuarios } from '../../../api/proyectos'
import { useToast } from '../../../hooks/useToast'
import { MONTO_REQUIERE_AUTORIZACION } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

export default function FormularioProyecto({ onCancelar, onCreado }) {
  const { showToast } = useToast()
  const [usuarios, setUsuarios] = useState([])
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [asignadoA, setAsignadoA] = useState('')
  const [presupuestoTotal, setPresupuestoTotal] = useState('')
  const [fechaInicioEstimada, setFechaInicioEstimada] = useState('')
  const [fechaFinEstimada, setFechaFinEstimada] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    getUsuarios().then(({ data }) => setUsuarios(data)).catch(() => setUsuarios([]))
  }, [])

  const superaLimite = presupuestoTotal && Number(presupuestoTotal) > MONTO_REQUIERE_AUTORIZACION
  const puedeGuardar = Boolean(nombre.trim() && descripcion.trim() && asignadoA)

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const { data } = await createProyecto({
        nombre,
        descripcion,
        asignado_a: asignadoA,
        presupuesto_total: presupuestoTotal || null,
        fecha_inicio_estimada: fechaInicioEstimada || null,
        fecha_fin_estimada: fechaFinEstimada || null,
        observaciones,
      })
      showToast(`✅ Proyecto ${data.folio} creado`, 'exito')
      onCreado?.()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo crear el proyecto.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-xl font-bold text-text">Nuevo proyecto</h2>

      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="nombre" className="mb-1 block text-sm font-medium text-text-secondary">
            Nombre del proyecto *
          </label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputClass}
            placeholder="Ej. Reparación de cerca perimetral"
          />
        </div>

        <div>
          <label htmlFor="descripcion" className="mb-1 block text-sm font-medium text-text-secondary">
            Descripción *
          </label>
          <textarea
            id="descripcion"
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="asignado_a" className="mb-1 block text-sm font-medium text-text-secondary">
            Asignar a *
          </label>
          <select id="asignado_a" value={asignadoA} onChange={(e) => setAsignadoA(e.target.value)} className={inputClass}>
            <option value="">Selecciona…</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="presupuesto_total" className="mb-1 block text-sm font-medium text-text-secondary">
            Presupuesto total (opcional)
          </label>
          <input
            id="presupuesto_total"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={presupuestoTotal}
            onChange={(e) => setPresupuestoTotal(e.target.value)}
            className={inputClass}
            placeholder="$0.00"
          />
          {superaLimite && (
            <p className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              ⚠️ Este proyecto superará $50,000 MXN — quedará pendiente de autorización de Alberto.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fecha_inicio" className="mb-1 block text-sm font-medium text-text-secondary">
              Inicio estimado
            </label>
            <input
              id="fecha_inicio"
              type="date"
              value={fechaInicioEstimada}
              onChange={(e) => setFechaInicioEstimada(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="fecha_fin" className="mb-1 block text-sm font-medium text-text-secondary">
              Fin estimado
            </label>
            <input
              id="fecha_fin"
              type="date"
              value={fechaFinEstimada}
              onChange={(e) => setFechaFinEstimada(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="observaciones" className="mb-1 block text-sm font-medium text-text-secondary">
            Observaciones (opcional)
          </label>
          <textarea
            id="observaciones"
            rows={3}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onCancelar}
          style={{ minHeight: '56px' }}
          className="flex-1 rounded-xl border border-border text-base text-text-secondary transition hover:border-text-secondary hover:text-text"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleGuardar}
          disabled={!puedeGuardar || guardando}
          style={{ minHeight: '56px' }}
          className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? 'Creando…' : '🏗️ Crear proyecto'}
        </button>
      </div>
    </div>
  )
}
