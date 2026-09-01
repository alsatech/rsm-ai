import { useEffect, useState } from 'react'

import { createProducto, getCategorias, getProductos, getUbicaciones } from '../../../api/inventario'
import { useToast } from '../../../hooks/useToast'
import { UBICACION_LABELS, UNIDAD_LABELS } from '../constants'
import FormularioProducto from './FormularioProducto'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

// Mismos roles que ROLES_CATALOGO en el backend (permissions.py) — quien puede dar de alta
// un producto también puede registrar la entrada inicial, así que reutilizamos el flag que
// ya nos pasa el wizard en vez de volver a resolver el rol aquí.
export default function Paso1Producto({ form, setForm, productoSeleccionado, setProductoSeleccionado, puedeRegistrarEntrada }) {
  const { showToast } = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [guardando, setGuardando] = useState(false)

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

  const abrirFormularioProducto = async () => {
    if (!categorias.length || !ubicaciones.length) {
      const [cats, ubis] = await Promise.all([getCategorias(), getUbicaciones()])
      setCategorias(cats.data)
      setUbicaciones(ubis.data)
    }
    setMostrarFormulario(true)
  }

  const handleCrearProducto = async (data) => {
    setGuardando(true)
    try {
      const { data: nuevoProducto } = await createProducto(data)
      showToast('✅ Producto creado', 'exito')
      setMostrarFormulario(false)
      // Lo dejamos elegido y listo para registrar la entrada inicial — así el alta de un
      // producto nuevo y su primer movimiento quedan en el mismo flujo, sin salir del wizard.
      elegirProducto(nuevoProducto)
      setForm((prev) => ({ ...prev, tipo: 'entrada' }))
    } catch (err) {
      const mensaje = err?.response?.data?.codigo?.[0] || 'No se pudo crear el producto.'
      showToast(mensaje, 'error')
    } finally {
      setGuardando(false)
    }
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

            {puedeRegistrarEntrada && !buscando && resultados.length === 0 && (
              <button
                type="button"
                onClick={abrirFormularioProducto}
                style={{ minHeight: '48px' }}
                className="mt-2 w-full rounded-xl border-2 border-dashed border-accent text-sm font-semibold text-highlight transition hover:bg-card"
              >
                {busqueda.trim().length >= 2
                  ? `+ Dar de alta “${busqueda}” como producto nuevo`
                  : '+ Nuevo producto'}
              </button>
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

      {mostrarFormulario && (
        <FormularioProducto
          categorias={categorias}
          ubicaciones={ubicaciones}
          onGuardar={handleCrearProducto}
          onCancelar={() => setMostrarFormulario(false)}
          guardando={guardando}
        />
      )}
    </div>
  )
}
