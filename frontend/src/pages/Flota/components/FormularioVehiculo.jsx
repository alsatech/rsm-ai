import { useRef, useState } from 'react'

import { TIPO_LABELS } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'
const labelClass = 'mb-1 block text-sm font-medium text-text-secondary'

const ESTADO_OPCIONES = [
  { value: 'activo', label: 'Activo' },
  { value: 'en_taller', label: 'En taller' },
  { value: 'de_baja', label: 'De baja' },
]

function estadoInicial(vehiculo) {
  return {
    nombre: vehiculo?.nombre ?? '',
    tipo: vehiculo?.tipo ?? 'camioneta',
    marca: vehiculo?.marca ?? '',
    modelo: vehiculo?.modelo ?? '',
    anio: vehiculo?.anio ?? '',
    color: vehiculo?.color ?? '',
    placas: vehiculo?.placas ?? '',
    numero_serie: vehiculo?.numero_serie ?? '',
    kilometraje_actual: vehiculo?.kilometraje_actual ?? '',
    uso_asignacion: vehiculo?.uso_asignacion ?? '',
    estado: vehiculo?.estado ?? 'activo',
    fecha_vencimiento_tenencia: vehiculo?.fecha_vencimiento_tenencia ?? '',
    fecha_vencimiento_placas: vehiculo?.fecha_vencimiento_placas ?? '',
    notas: vehiculo?.notas ?? '',
  }
}

export default function FormularioVehiculo({ vehiculo, onGuardar, onCancelar, guardando }) {
  const [form, setForm] = useState(estadoInicial(vehiculo))
  const [foto, setFoto] = useState(null)
  const fileRef = useRef(null)
  const esEdicion = Boolean(vehiculo)

  const handleChange = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (value !== '' && value !== null) fd.append(key, value)
    })
    if (foto) fd.append('foto', foto)
    await onGuardar(fd)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
      onClick={onCancelar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg animate-[scaleIn_0.15s_ease-out] rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="mb-4 text-xl font-bold text-text">
          {esEdicion ? 'Editar vehículo' : 'Nuevo vehículo'}
        </h2>

        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div>
            <label className={labelClass} htmlFor="nombre">Nombre / apodo *</label>
            <input id="nombre" required value={form.nombre} onChange={handleChange('nombre')} className={inputClass} placeholder="Ej: Savana" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="tipo">Tipo *</label>
              <select id="tipo" value={form.tipo} onChange={handleChange('tipo')} className={inputClass}>
                {Object.entries(TIPO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="estado">Estado *</label>
              <select id="estado" value={form.estado} onChange={handleChange('estado')} className={inputClass}>
                {ESTADO_OPCIONES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="marca">Marca *</label>
              <input id="marca" required value={form.marca} onChange={handleChange('marca')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="modelo">Modelo *</label>
              <input id="modelo" required value={form.modelo} onChange={handleChange('modelo')} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="anio">Año *</label>
              <input id="anio" type="number" required value={form.anio} onChange={handleChange('anio')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="color">Color *</label>
              <input id="color" required value={form.color} onChange={handleChange('color')} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="placas">Placas</label>
              <input id="placas" value={form.placas} onChange={handleChange('placas')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="numero_serie">Número de serie</label>
              <input id="numero_serie" value={form.numero_serie} onChange={handleChange('numero_serie')} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="kilometraje_actual">Kilometraje actual *</label>
            <input id="kilometraje_actual" type="number" step="0.01" required value={form.kilometraje_actual} onChange={handleChange('kilometraje_actual')} className={inputClass} />
          </div>

          <div>
            <label className={labelClass} htmlFor="uso_asignacion">Uso / asignación</label>
            <input id="uso_asignacion" value={form.uso_asignacion} onChange={handleChange('uso_asignacion')} className={inputClass} placeholder="Ej: uso general del rancho" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="fecha_vencimiento_tenencia">Vence tenencia</label>
              <input id="fecha_vencimiento_tenencia" type="date" value={form.fecha_vencimiento_tenencia} onChange={handleChange('fecha_vencimiento_tenencia')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="fecha_vencimiento_placas">Vencen placas</label>
              <input id="fecha_vencimiento_placas" type="date" value={form.fecha_vencimiento_placas} onChange={handleChange('fecha_vencimiento_placas')} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="foto-vehiculo">Foto</label>
            <input
              ref={fileRef}
              id="foto-vehiculo"
              type="file"
              accept="image/*"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-highlight"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="notas">Notas</label>
            <textarea id="notas" rows={2} value={form.notas} onChange={handleChange('notas')} className={inputClass} />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancelar}
              style={{ minHeight: '52px' }}
              className="flex-1 rounded-xl border border-border text-text-secondary transition hover:border-text-secondary hover:text-text"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              style={{ minHeight: '52px' }}
              className="flex-1 rounded-xl bg-accent font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
