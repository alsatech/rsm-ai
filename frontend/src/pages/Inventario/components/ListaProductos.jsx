import { useCallback, useEffect, useState } from 'react'

import { createProducto, getCategorias, getProductos, getUbicaciones } from '../../../api/inventario'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { ESTADO_STOCK_CONFIG, UBICACION_LABELS, UNIDAD_LABELS, estadoStock } from '../constants'
import FormularioProducto from './FormularioProducto'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

export default function ListaProductos({ categoriaInicial, recargar, onVolver, onNuevoMovimiento, onProductoCreado }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState(categoriaInicial ?? '')
  const [ubicacion, setUbicacion] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const puedeGestionarCatalogo = ['inventario', 'administrador', 'superadmin'].includes(user?.rol)
  const puedeRegistrarMovimiento = user?.rol !== 'operaciones'

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = { activo: true }
      if (categoria) params.categoria = categoria
      if (ubicacion) params.ubicacion = ubicacion
      if (busqueda) params.q = busqueda
      const [prods, cats, ubis] = await Promise.all([
        getProductos(params),
        categorias.length ? Promise.resolve({ data: categorias }) : getCategorias(),
        ubicaciones.length ? Promise.resolve({ data: ubicaciones }) : getUbicaciones(),
      ])
      setProductos(prods.data)
      setCategorias(cats.data)
      setUbicaciones(ubis.data)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, ubicacion, busqueda])

  useEffect(() => { cargar() }, [cargar, recargar])

  const productosFiltrados = estadoFiltro
    ? productos.filter((p) => estadoStock(p) === estadoFiltro)
    : productos

  const handleCrearProducto = async (data) => {
    setGuardando(true)
    try {
      await createProducto(data)
      showToast('✅ Producto creado', 'exito')
      setMostrarFormulario(false)
      cargar()
      onProductoCreado?.()
    } catch (err) {
      const mensaje = err?.response?.data?.codigo?.[0] || 'No se pudo crear el producto.'
      showToast(mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-svh bg-bg pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="font-bold text-highlight">Productos</h1>
            <p className="text-xs text-text-secondary">{productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-5">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por código o descripción…"
          className={`${inputClass} mb-3`}
        />

        <div className="mb-4 grid grid-cols-3 gap-2">
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClass}>
            <option value="">Categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
            ))}
          </select>
          <select value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className={inputClass}>
            <option value="">Ubicación</option>
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.id}>{UBICACION_LABELS[u.nombre] ?? u.nombre_display}</option>
            ))}
          </select>
          <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className={inputClass}>
            <option value="">Estado</option>
            <option value="critico">🔴 Crítico</option>
            <option value="bajo">🟡 Bajo</option>
            <option value="normal">🟢 Normal</option>
          </select>
        </div>

        {puedeGestionarCatalogo && (
          <button
            type="button"
            onClick={() => setMostrarFormulario(true)}
            style={{ minHeight: '52px' }}
            className="mb-4 w-full rounded-xl border-2 border-dashed border-accent text-sm font-semibold text-highlight transition hover:bg-card sm:w-auto sm:px-6"
          >
            + Nuevo producto
          </button>
        )}

        {loading && <p className="text-center text-sm text-text-secondary">Cargando productos…</p>}

        {!loading && productosFiltrados.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">📦</span>
            <p className="text-text-secondary">No se encontraron productos.</p>
          </div>
        )}

        {!loading && productosFiltrados.length > 0 && (
          <div className="flex flex-col gap-3">
            {productosFiltrados.map((producto) => {
              const estado = estadoStock(producto)
              const conf = ESTADO_STOCK_CONFIG[estado]
              return (
                <div
                  key={producto.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-mono text-xs text-text-secondary">
                      {producto.codigo}
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${conf.border} ${conf.text} ${conf.bg}`}>
                        {conf.icon} {conf.label}
                      </span>
                    </p>
                    <p className="truncate font-semibold text-text">{producto.descripcion}</p>
                    <p className="text-xs text-text-secondary">
                      {producto.categoria_detalle?.icono} {producto.categoria_detalle?.nombre} · {UBICACION_LABELS[producto.ubicacion_detalle?.nombre]}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <p className="font-mono text-lg font-bold text-text">
                      {Number(producto.stock_actual).toLocaleString('es-MX')}
                      <span className="ml-1 text-xs font-normal text-text-secondary">{UNIDAD_LABELS[producto.unidad_medida]}</span>
                    </p>
                    {puedeRegistrarMovimiento && (
                      <button
                        type="button"
                        onClick={() => onNuevoMovimiento(producto)}
                        style={{ minHeight: '44px' }}
                        className="rounded-xl bg-accent px-4 text-sm font-bold text-highlight transition hover:opacity-90"
                      >
                        Movimiento
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

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
