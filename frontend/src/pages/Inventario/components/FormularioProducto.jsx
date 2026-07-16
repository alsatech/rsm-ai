import { useState } from 'react'

import { UBICACION_LABELS, UNIDAD_LABELS } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'
const labelClass = 'mb-1 block text-sm font-medium text-text-secondary'

export default function FormularioProducto({ categorias, ubicaciones, onGuardar, onCancelar, guardando }) {
  const [form, setForm] = useState({
    codigo: '',
    descripcion: '',
    categoria: categorias[0]?.id ?? '',
    ubicacion: ubicaciones[0]?.id ?? '',
    unidad_medida: 'pieza',
    stock_minimo: '',
    notas: '',
  })

  const handleChange = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onGuardar({ ...form, stock_minimo: form.stock_minimo || 0 })
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
        <h2 className="mb-4 text-xl font-bold text-text">Nuevo producto</h2>

        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div>
            <label className={labelClass} htmlFor="codigo">Código *</label>
            <input id="codigo" required value={form.codigo} onChange={handleChange('codigo')} className={inputClass} placeholder="Ej: SM-200" />
          </div>

          <div>
            <label className={labelClass} htmlFor="descripcion">Descripción *</label>
            <input id="descripcion" required value={form.descripcion} onChange={handleChange('descripcion')} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="categoria">Categoría *</label>
              <select id="categoria" required value={form.categoria} onChange={handleChange('categoria')} className={inputClass}>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="ubicacion">Ubicación *</label>
              <select id="ubicacion" required value={form.ubicacion} onChange={handleChange('ubicacion')} className={inputClass}>
                {ubicaciones.map((u) => (
                  <option key={u.id} value={u.id}>{UBICACION_LABELS[u.nombre] ?? u.nombre_display}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="unidad_medida">Unidad *</label>
              <select id="unidad_medida" value={form.unidad_medida} onChange={handleChange('unidad_medida')} className={inputClass}>
                {Object.entries(UNIDAD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="stock_minimo">Stock mínimo</label>
              <input id="stock_minimo" type="number" step="0.01" min="0" value={form.stock_minimo} onChange={handleChange('stock_minimo')} className={inputClass} placeholder="0" />
            </div>
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
              {guardando ? 'Guardando…' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
