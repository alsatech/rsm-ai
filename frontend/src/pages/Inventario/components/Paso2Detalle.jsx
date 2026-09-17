import { useAuth } from '../../../hooks/useAuth'
import { SUGERENCIAS_USO, UNIDAD_LABELS, esProductoCombustible } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'
const labelClass = 'mb-1 block text-sm font-medium text-text-secondary'

const ROLES_ASIGNAN_RESPONSABLE = ['inventario', 'administrador', 'superadmin']

export default function Paso2Detalle({ form, setForm, productoSeleccionado, vehiculos, usuarios }) {
  const { user } = useAuth()
  const puedeAsignarResponsable = ROLES_ASIGNAN_RESPONSABLE.includes(user?.rol)
  const esCombustible = esProductoCombustible(productoSeleccionado)

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
    </div>
  )
}
