import { useEffect, useState } from 'react'

import { getProductos } from '../../../api/inventario'
import { UBICACION_LABELS, UNIDAD_LABELS } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

export default function Paso1Producto({ form, setForm, productoSeleccionado, setProductoSeleccionado, puedeRegistrarEntrada }) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    if (productoSeleccionado || busqueda.trim().length < 2) {
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
  }, [busqueda, productoSeleccionado])

  const elegirProducto = (producto) => {
    setProductoSeleccionado(producto)
    setForm((prev) => ({ ...prev, producto: producto.id }))
    setBusqueda('')
    setResultados([])
  }

  const quitarProducto = () => {
    setProductoSeleccionado(null)
    setForm((prev) => ({ ...prev, producto: null }))
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-text-secondary">¿Qué es?</p>

        {!productoSeleccionado && (
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
              <div className="mt-2 flex flex-col gap-2 rounded-xl border border-border bg-card p-2">
                {resultados.map((producto) => (
                  <button
                    key={producto.id}
                    type="button"
                    onClick={() => elegirProducto(producto)}
                    className="rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-bg"
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
              onClick={quitarProducto}
              className="text-sm font-semibold text-text-secondary hover:text-error"
            >
              Cambiar
            </button>
          </div>
        )}
      </div>

      {productoSeleccionado && (
        <div>
          <p className="mb-2 text-sm font-semibold text-text-secondary">Tipo de movimiento</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, tipo: 'salida' }))}
              style={{ minHeight: '64px' }}
              className={`rounded-xl border-2 text-base font-bold transition ${
                form.tipo === 'salida'
                  ? 'border-highlight bg-highlight/10 text-highlight'
                  : 'border-border text-text-secondary hover:border-accent'
              }`}
            >
              📤 Salida
            </button>
            {puedeRegistrarEntrada && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, tipo: 'entrada' }))}
                style={{ minHeight: '64px' }}
                className={`rounded-xl border-2 text-base font-bold transition ${
                  form.tipo === 'entrada'
                    ? 'border-highlight bg-highlight/10 text-highlight'
                    : 'border-border text-text-secondary hover:border-accent'
                }`}
              >
                📥 Entrada
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
