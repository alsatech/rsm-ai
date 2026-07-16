import { useEffect, useState } from 'react'

import { getUsuarios } from '../../../api/flota'
import { useAuth } from '../../../hooks/useAuth'
import { SUGERENCIAS_USO, UNIDAD_LABELS, VEHICULOS_COMBUSTIBLE, esProductoCombustible } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'
const labelClass = 'mb-1 block text-sm font-medium text-text-secondary'

const ROLES_ASIGNAN_RESPONSABLE = ['inventario', 'administrador', 'superadmin']

export default function Paso2Detalle({ form, setForm, productoSeleccionado, setFoto }) {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const puedeAsignarResponsable = ROLES_ASIGNAN_RESPONSABLE.includes(user?.rol)
  const esCombustible = esProductoCombustible(productoSeleccionado)
  const esEntrada = form.tipo === 'entrada'

  useEffect(() => {
    if (!puedeAsignarResponsable || esEntrada) return
    getUsuarios().then(({ data }) => setUsuarios(data)).catch(() => {})
  }, [puedeAsignarResponsable, esEntrada])

  const handleChange = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }))

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className={labelClass} htmlFor="cantidad">
          Cantidad ({UNIDAD_LABELS[productoSeleccionado?.unidad_medida]}) *
        </label>
        <input
          id="cantidad"
          type="number"
          step="0.01"
          min="0.01"
          required
          autoFocus
          value={form.cantidad}
          onChange={handleChange('cantidad')}
          style={{ minHeight: '56px', fontSize: '1.25rem' }}
          className={`${inputClass} text-center font-mono font-bold`}
        />
      </div>

      {!esEntrada && (
        <>
          {puedeAsignarResponsable && (
            <div>
              <label className={labelClass} htmlFor="responsable">Responsable</label>
              <select id="responsable" value={form.responsable ?? ''} onChange={handleChange('responsable')} className={inputClass}>
                <option value="">Yo ({user?.nombre})</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass} htmlFor="uso_descripcion">¿Para qué se usará?</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {SUGERENCIAS_USO.map((sugerencia) => (
                <button
                  key={sugerencia}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, uso_descripcion: sugerencia }))}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-accent hover:text-text"
                >
                  {sugerencia}
                </button>
              ))}
            </div>
            <textarea
              id="uso_descripcion"
              rows={2}
              value={form.uso_descripcion}
              onChange={handleChange('uso_descripcion')}
              className={inputClass}
              placeholder="Ej: Revoltura para los saleros"
            />
          </div>

          {esCombustible && (
            <div>
              <label className={labelClass} htmlFor="vehiculo_codigo">Vehículo</label>
              <select id="vehiculo_codigo" value={form.vehiculo_codigo} onChange={handleChange('vehiculo_codigo')} className={inputClass}>
                <option value="">Selecciona un vehículo</option>
                {VEHICULOS_COMBUSTIBLE.map((v) => (
                  <option key={v.codigo} value={v.codigo}>{v.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass} htmlFor="proyecto_referencia">Proyecto (opcional)</label>
            <input
              id="proyecto_referencia"
              value={form.proyecto_referencia}
              onChange={handleChange('proyecto_referencia')}
              className={inputClass}
              placeholder="Referencia de proyecto, si aplica"
            />
          </div>
        </>
      )}

      {esEntrada && (
        <>
          <div>
            <label className={labelClass} htmlFor="uso_descripcion">Proveedor / origen</label>
            <input
              id="uso_descripcion"
              value={form.uso_descripcion}
              onChange={handleChange('uso_descripcion')}
              className={inputClass}
              placeholder="Ej: Ferretería Minerva CDMX"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="notas">Referencia de factura (opcional)</label>
            <input
              id="notas"
              value={form.notas}
              onChange={handleChange('notas')}
              className={inputClass}
              placeholder="Ej: Factura A-1023"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="foto-evidencia">Foto de evidencia / factura (opcional)</label>
            <input
              id="foto-evidencia"
              type="file"
              accept="image/*"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-highlight"
            />
          </div>
        </>
      )}
    </div>
  )
}
