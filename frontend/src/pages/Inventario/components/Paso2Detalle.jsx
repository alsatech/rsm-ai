import { useAuth } from '../../../hooks/useAuth'
import { SUGERENCIAS_USO, UNIDAD_LABELS, esProductoCombustible } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'
const labelClass = 'mb-1 block text-sm font-medium text-text-secondary'

const ROLES_ASIGNAN_RESPONSABLE = ['inventario', 'administrador', 'superadmin']
const ROLES_COMPRAN = ['operaciones', 'inventario', 'administrador', 'superadmin']

export default function Paso2Detalle({ form, setForm, productoSeleccionado, foto, setFoto, vehiculos, usuarios }) {
  const { user } = useAuth()
  const puedeAsignarResponsable = ROLES_ASIGNAN_RESPONSABLE.includes(user?.rol)
  const esCombustible = esProductoCombustible(productoSeleccionado)
  const esEntrada = form.tipo === 'entrada'
  const esCompra = esEntrada && Number(form.monto_compra) > 0

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
              <label className={labelClass} htmlFor="vehiculo">
                Vehículo <span className="text-error">*</span>
              </label>
              <select
                id="vehiculo"
                required
                value={form.vehiculo ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, vehiculo: e.target.value ? Number(e.target.value) : null }))
                }
                className={inputClass}
              >
                <option value="">Selecciona un vehículo</option>
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre} — {v.marca} {v.modelo} ({v.placas || 's/placas'})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-secondary">
                Obligatorio para registrar salidas de combustible.
              </p>
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
            <label className={labelClass} htmlFor="foto-evidencia">
              Foto de evidencia / factura {esCompra ? <span className="text-error">*</span> : '(opcional)'}
            </label>
            <input
              id="foto-evidencia"
              type="file"
              accept="image/*"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-highlight"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="monto_compra">Monto de la compra (opcional)</label>
            <input
              id="monto_compra"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.monto_compra}
              onChange={handleChange('monto_compra')}
              className={inputClass}
              placeholder="$0.00"
            />
            <p className="mt-1 text-xs text-text-secondary">
              Si indicas un monto, esta entrada aparecerá en la Relación de compras semanal.
            </p>
          </div>

          {esCompra && (
            <div>
              <label className={labelClass} htmlFor="comprado_por">
                ¿Quién hizo la compra? <span className="text-error">*</span>
              </label>
              <select
                id="comprado_por"
                value={form.comprado_por}
                onChange={handleChange('comprado_por')}
                className={inputClass}
              >
                <option value="">Selecciona…</option>
                {usuarios.filter((u) => ROLES_COMPRAN.includes(u.rol)).map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
              {!foto && (
                <p className="mt-1 text-xs text-warning">Falta la foto de evidencia — es obligatoria para registrar una compra.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
