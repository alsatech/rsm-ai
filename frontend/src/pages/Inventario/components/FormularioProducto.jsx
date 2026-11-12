import { useEffect, useState } from 'react'

import { ajustarStockProducto, getSiguienteCodigoProducto } from '../../../api/inventario'
import { useToast } from '../../../hooks/useToast'
import { CRITICIDAD_LABELS, UBICACION_LABELS, UNIDAD_LABELS } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'
const labelClass = 'mb-1 block text-sm font-medium text-text-secondary'

function estadoInicial(producto, categorias, ubicaciones) {
  if (producto) {
    return {
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      categoria: producto.categoria,
      ubicacion: producto.ubicacion,
      unidad_medida: producto.unidad_medida,
      stock_minimo: producto.stock_minimo ?? '',
      costo_unitario: producto.costo_unitario ?? '',
      criticidad: producto.criticidad,
      notas: producto.notas ?? '',
    }
  }
  return {
    codigo: '',
    descripcion: '',
    categoria: categorias[0]?.id ?? '',
    ubicacion: ubicaciones[0]?.id ?? '',
    unidad_medida: 'pieza',
    stock_minimo: '',
    costo_unitario: '',
    criticidad: 'media',
    notas: '',
  }
}

// Reutilizado para crear y editar: en alta sugiere el siguiente código disponible (Yajaira ya
// no tiene que adivinar con cuál seguir) y en edición permite ajustar el stock aparte, con
// motivo, para que la corrección quede en el historial del producto (ver AjustarStockView).
export default function FormularioProducto({ producto, categorias, ubicaciones, onGuardar, onCancelar, guardando }) {
  const { showToast } = useToast()
  const esEdicion = Boolean(producto)
  const [form, setForm] = useState(() => estadoInicial(producto, categorias, ubicaciones))
  const [codigoSugerido, setCodigoSugerido] = useState('')
  const [mostrarAjusteStock, setMostrarAjusteStock] = useState(false)
  const [stockNuevo, setStockNuevo] = useState(producto?.stock_actual ?? '')
  const [motivoAjuste, setMotivoAjuste] = useState('')
  const [ajustando, setAjustando] = useState(false)
  const [stockActual, setStockActual] = useState(producto?.stock_actual ?? 0)

  useEffect(() => {
    if (esEdicion) return
    getSiguienteCodigoProducto()
      .then(({ data }) => {
        setCodigoSugerido(data.siguiente_codigo)
        setForm((prev) => (prev.codigo ? prev : { ...prev, codigo: data.siguiente_codigo }))
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onGuardar({ ...form, stock_minimo: form.stock_minimo || 0, costo_unitario: form.costo_unitario || 0 })
  }

  const handleAjustarStock = async (e) => {
    e.preventDefault()
    if (stockNuevo === '' || !motivoAjuste.trim()) return
    setAjustando(true)
    try {
      await ajustarStockProducto(producto.id, { stock_nuevo: stockNuevo, motivo: motivoAjuste })
      showToast('✅ Stock ajustado', 'exito')
      setStockActual(Number(stockNuevo))
      setMostrarAjusteStock(false)
      setMotivoAjuste('')
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo ajustar el stock.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setAjustando(false)
    }
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
        <h2 className="mb-4 text-xl font-bold text-text">{esEdicion ? 'Editar producto' : 'Nuevo producto'}</h2>

        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div>
            <label className={labelClass} htmlFor="codigo">Código *</label>
            {esEdicion ? (
              <p className="rounded-lg border border-border bg-bg px-4 py-3 font-mono text-sm text-text-secondary">
                {form.codigo}
              </p>
            ) : (
              <>
                <input id="codigo" required value={form.codigo} onChange={handleChange('codigo')} className={inputClass} placeholder="Ej: SM-200" />
                {codigoSugerido && (
                  <p className="mt-1 text-xs text-text-secondary">Último código del catálogo: siguiente sugerido {codigoSugerido}.</p>
                )}
              </>
            )}
          </div>

          {esEdicion && (
            <div>
              <label className={labelClass}>Stock actual</label>
              <div className="flex items-center justify-between rounded-lg border border-border bg-bg px-4 py-3">
                <span className="font-mono text-base font-bold text-text">
                  {stockActual} <span className="text-xs font-normal text-text-secondary">{UNIDAD_LABELS[form.unidad_medida]}</span>
                </span>
                <button
                  type="button"
                  onClick={() => { setMostrarAjusteStock((v) => !v); setStockNuevo(stockActual) }}
                  className="text-sm font-semibold text-highlight hover:underline"
                >
                  {mostrarAjusteStock ? 'Cancelar' : '✏️ Ajustar'}
                </button>
              </div>
              {mostrarAjusteStock && (
                <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-bg p-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={stockNuevo}
                    onChange={(e) => setStockNuevo(e.target.value)}
                    className={inputClass}
                    placeholder="Stock correcto"
                  />
                  <textarea
                    rows={2}
                    value={motivoAjuste}
                    onChange={(e) => setMotivoAjuste(e.target.value)}
                    className={inputClass}
                    placeholder="¿Por qué cambia el stock? (ej: conteo físico, merma)"
                  />
                  <button
                    type="button"
                    onClick={handleAjustarStock}
                    disabled={ajustando || stockNuevo === '' || !motivoAjuste.trim()}
                    style={{ minHeight: '44px' }}
                    className="rounded-lg bg-accent text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
                  >
                    {ajustando ? 'Guardando…' : 'Guardar ajuste de stock'}
                  </button>
                </div>
              )}
            </div>
          )}

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="costo_unitario">Costo unitario (MXN)</label>
              <input id="costo_unitario" type="number" step="0.01" min="0" value={form.costo_unitario} onChange={handleChange('costo_unitario')} className={inputClass} placeholder="0.00" />
            </div>
            <div>
              <label className={labelClass} htmlFor="criticidad">Criticidad</label>
              <select id="criticidad" value={form.criticidad} onChange={handleChange('criticidad')} className={inputClass}>
                {Object.entries(CRITICIDAD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
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
              {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
