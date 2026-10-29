import { useEffect, useState } from 'react'

import { getProductos, registrarEntradaRapida } from '../../../api/inventario'
import { useToast } from '../../../hooks/useToast'
import { UBICACION_LABELS, UNIDAD_LABELS } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'
const labelClass = 'mb-2 block text-sm font-semibold text-text-secondary'

// Alta rápida de material que Yajaira ya tiene en la mano: a diferencia de "+Movimiento"
// (que solo registra salidas) y de Adquisiciones (solicitud → envío → recepción → dar
// entrada), aquí no hay foto de factura ni proveedor — solo ubicación, material y cantidad.
export default function EntradaRapida({ ubicaciones, onGuardado, onCerrar }) {
  const { showToast } = useToast()
  const [ubicacionId, setUbicacionId] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [cantidad, setCantidad] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!ubicacionId || productoSeleccionado || busqueda.trim().length < 2) {
      setResultados([])
      return
    }
    setBuscando(true)
    const timeout = setTimeout(() => {
      getProductos({ q: busqueda, activo: true })
        .then(({ data }) => setResultados(data.slice(0, 8)))
        .finally(() => setBuscando(false))
    }, 250)
    return () => clearTimeout(timeout)
  }, [busqueda, ubicacionId, productoSeleccionado])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!productoSeleccionado || !cantidad) return
    setGuardando(true)
    try {
      await registrarEntradaRapida({
        producto: productoSeleccionado.id,
        ubicacion: ubicacionId,
        cantidad,
        notas,
      })
      showToast('✅ Entrada registrada', 'exito')
      onGuardado?.()
    } catch {
      showToast('No se pudo registrar la entrada.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg animate-[scaleIn_0.15s_ease-out] rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="mb-1 text-xl font-bold text-text">⚡ Entrada rápida</h2>
        <p className="mb-4 text-xs text-text-secondary">Material que ya tienes en la mano — sin factura ni proveedor.</p>

        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div>
            <label className={labelClass} htmlFor="ubicacion-entrada-rapida">1. ¿A qué ubicación va a entrar?</label>
            <select
              id="ubicacion-entrada-rapida"
              required
              value={ubicacionId}
              onChange={(e) => {
                setUbicacionId(e.target.value)
                setProductoSeleccionado(null)
                setBusqueda('')
              }}
              className={inputClass}
            >
              <option value="">Selecciona una ubicación…</option>
              {ubicaciones.map((u) => (
                <option key={u.id} value={u.id}>{UBICACION_LABELS[u.nombre] ?? u.nombre_display}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>2. ¿Qué material es?</label>
            {!ubicacionId && (
              <p className="rounded-lg border border-border bg-bg px-4 py-3 text-sm text-text-secondary">
                Primero elige la ubicación.
              </p>
            )}
            {ubicacionId && !productoSeleccionado && (
              <div className="relative">
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por código o descripción…"
                  className={inputClass}
                  autoFocus
                />
                {buscando && <p className="mt-2 text-xs text-text-secondary">Buscando…</p>}
                {resultados.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2 rounded-xl border border-border bg-bg p-2">
                    {resultados.map((producto) => (
                      <button
                        key={producto.id}
                        type="button"
                        onClick={() => { setProductoSeleccionado(producto); setBusqueda(''); setResultados([]) }}
                        className="rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-card"
                      >
                        <p className="font-mono text-xs text-text-secondary">{producto.codigo}</p>
                        <p className="font-semibold text-text">{producto.descripcion}</p>
                        <p className="text-xs text-text-secondary">
                          Stock: {producto.stock_actual} {UNIDAD_LABELS[producto.unidad_medida]} · {UBICACION_LABELS[producto.ubicacion_detalle?.nombre]}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {!buscando && busqueda.trim().length >= 2 && resultados.length === 0 && (
                  <p className="mt-2 text-xs text-text-secondary">Sin resultados en el catálogo.</p>
                )}
              </div>
            )}
            {productoSeleccionado && (
              <div className="flex items-center justify-between rounded-xl border-2 border-highlight bg-highlight/10 px-4 py-3">
                <div>
                  <p className="font-mono text-xs text-text-secondary">{productoSeleccionado.codigo}</p>
                  <p className="font-bold text-text">{productoSeleccionado.descripcion}</p>
                  <p className="text-sm text-text-secondary">
                    Stock actual: {productoSeleccionado.stock_actual} {UNIDAD_LABELS[productoSeleccionado.unidad_medida]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProductoSeleccionado(null)}
                  className="text-sm font-semibold text-text-secondary hover:text-error"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>

          {productoSeleccionado && (
            <div>
              <label className={labelClass} htmlFor="cantidad-entrada-rapida">3. ¿Cuánto entró?</label>
              <input
                id="cantidad-entrada-rapida"
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className={inputClass}
                placeholder={`Cantidad en ${UNIDAD_LABELS[productoSeleccionado.unidad_medida]}`}
              />
            </div>
          )}

          {productoSeleccionado && (
            <div>
              <label className={labelClass} htmlFor="notas-entrada-rapida">Notas (opcional)</label>
              <textarea
                id="notas-entrada-rapida"
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCerrar}
              style={{ minHeight: '52px' }}
              className="flex-1 rounded-xl border border-border text-text-secondary transition hover:border-text-secondary hover:text-text"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!productoSeleccionado || !cantidad || guardando}
              style={{ minHeight: '52px' }}
              className="flex-1 rounded-xl bg-accent font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Registrar entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
