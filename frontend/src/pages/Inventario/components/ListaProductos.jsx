import { useCallback, useEffect, useState } from 'react'

import {
  createProducto,
  deleteProducto,
  getCategorias,
  getGrupoMaterial,
  getGruposMaterial,
  getProductos,
  getUbicaciones,
} from '../../../api/inventario'
import { useAuth } from '../../../hooks/useAuth'
import { useConfirm } from '../../../hooks/useConfirm'
import { useToast } from '../../../hooks/useToast'
import { ESTADO_STOCK_CONFIG, UBICACION_ICONS, UBICACION_LABELS, UNIDAD_LABELS, estadoStock } from '../constants'
import AgruparMateriales from './AgruparMateriales'
import EtiquetaGrupo from './EtiquetaGrupo'
import EtiquetaProducto from './EtiquetaProducto'
import EtiquetasUbicacion from './EtiquetasUbicacion'
import FormularioProducto from './FormularioProducto'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

export default function ListaProductos({ ubicacionInicial, grupoInicial, recargar, onVolver, onNuevoMovimiento, onProductoCreado }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [ubicacion, setUbicacion] = useState(ubicacionInicial ?? '')
  const [grupo, setGrupo] = useState(grupoInicial ?? '')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [productoParaEtiqueta, setProductoParaEtiqueta] = useState(null)
  const [mostrarEtiquetasUbicacion, setMostrarEtiquetasUbicacion] = useState(false)
  const [mostrarAgrupar, setMostrarAgrupar] = useState(false)
  const [grupoParaEditar, setGrupoParaEditar] = useState(null)
  const [grupoParaEtiqueta, setGrupoParaEtiqueta] = useState(null)

  const puedeGestionarCatalogo = ['inventario', 'administrador', 'superadmin'].includes(user?.rol)
  const puedeRegistrarMovimiento = user?.rol !== 'operaciones'

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = { activo: true }
      if (categoria) params.categoria = categoria
      if (ubicacion) params.ubicacion = ubicacion
      if (grupo) params.grupo = grupo
      if (busqueda) params.q = busqueda
      const [prods, cats, ubis, grps] = await Promise.all([
        getProductos(params),
        categorias.length ? Promise.resolve({ data: categorias }) : getCategorias(),
        ubicaciones.length ? Promise.resolve({ data: ubicaciones }) : getUbicaciones(),
        getGruposMaterial(ubicacion ? { ubicacion } : undefined),
      ])
      setProductos(prods.data)
      setCategorias(cats.data)
      setUbicaciones(ubis.data)
      setGrupos(grps.data)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, ubicacion, grupo, busqueda])

  useEffect(() => { cargar() }, [cargar, recargar])

  const productosFiltrados = estadoFiltro
    ? productos.filter((p) => estadoStock(p) === estadoFiltro)
    : productos

  const ubicacionActiva = ubicacionInicial ? ubicaciones.find((u) => String(u.id) === String(ubicacionInicial)) : null
  // grupoInicial llega al escanear el QR del grupo; grupo es el filtro manual del select — en
  // ambos casos queremos el mismo encabezado "estás viendo este grupo" y el botón de editarlo.
  const grupoActivo = grupos.find((g) => String(g.id) === String(grupoInicial || grupo)) ?? null

  const abrirEtiquetaGrupo = async (grupoId) => {
    try {
      const { data } = await getGrupoMaterial(grupoId)
      setGrupoParaEtiqueta(data)
    } catch {
      showToast('No se pudo cargar el grupo.', 'error')
    }
  }

  const abrirEdicionGrupo = async (grupoId) => {
    try {
      const { data } = await getGrupoMaterial(grupoId)
      setGrupoParaEditar(data)
    } catch {
      showToast('No se pudo cargar el grupo.', 'error')
    }
  }

  const handleGrupoGuardado = (grupoGuardado) => {
    const eraCreacion = !grupoParaEditar
    setMostrarAgrupar(false)
    setGrupoParaEditar(null)
    cargar()
    onProductoCreado?.()
    if (eraCreacion) setGrupoParaEtiqueta(grupoGuardado)
  }

  const handleEliminarProducto = async (producto) => {
    const confirmado = await confirm({
      titulo: '¿Eliminar este material?',
      mensaje: `"${producto.descripcion}" se quitará de ${UBICACION_LABELS[producto.ubicacion_detalle?.nombre] ?? 'esta ubicación'} y del inventario general. Su historial de movimientos se conserva.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      variante: 'peligro',
    })
    if (!confirmado) return
    try {
      await deleteProducto(producto.id)
      showToast('🗑️ Producto eliminado', 'exito')
      cargar()
      onProductoCreado?.()
    } catch {
      showToast('No se pudo eliminar el producto.', 'error')
    }
  }

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
            <h1 className="font-bold text-highlight">
              {grupoActivo
                ? `🏷️ ${grupoActivo.nombre}`
                : ubicacionActiva
                  ? `${UBICACION_ICONS[ubicacionActiva.nombre] ?? '📍'} ${UBICACION_LABELS[ubicacionActiva.nombre] ?? ubicacionActiva.nombre_display}`
                  : 'Productos'}
            </h1>
            <p className="text-xs text-text-secondary">{productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? 's' : ''}</p>
          </div>
          {grupoActivo && puedeGestionarCatalogo && (
            <button
              type="button"
              onClick={() => abrirEdicionGrupo(grupoActivo.id)}
              className="ml-auto flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text"
            >
              ✏️ Editar grupo
            </button>
          )}
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

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClass}>
            <option value="">Categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
            ))}
          </select>
          <select value={ubicacion} onChange={(e) => { setUbicacion(e.target.value); setGrupo('') }} className={inputClass}>
            <option value="">Ubicación</option>
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.id}>{UBICACION_LABELS[u.nombre] ?? u.nombre_display}</option>
            ))}
          </select>
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className={inputClass}>
            <option value="">Grupo</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>🏷️ {g.nombre}</option>
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
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMostrarFormulario(true)}
              style={{ minHeight: '52px' }}
              className="flex-1 rounded-xl border-2 border-dashed border-accent px-6 text-sm font-semibold text-highlight transition hover:bg-card sm:flex-none"
            >
              + Nuevo producto
            </button>
            <button
              type="button"
              onClick={() => setMostrarAgrupar(true)}
              style={{ minHeight: '52px' }}
              className="flex-1 rounded-xl border border-border px-6 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text sm:flex-none"
            >
              🏷️ Agrupar materiales
            </button>
            {ubicacionActiva && productosFiltrados.length > 0 && (
              <button
                type="button"
                onClick={() => setMostrarEtiquetasUbicacion(true)}
                style={{ minHeight: '52px' }}
                className="flex-1 rounded-xl border border-border px-6 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text sm:flex-none"
              >
                🖨️ Imprimir etiquetas de esta ubicación
              </button>
            )}
          </div>
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
                    {producto.grupo_detalle && (
                      <button
                        type="button"
                        onClick={() => abrirEtiquetaGrupo(producto.grupo_detalle.id)}
                        className="mt-1 text-xs font-semibold text-highlight hover:underline"
                      >
                        🏷️ {producto.grupo_detalle.nombre}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <p className="font-mono text-lg font-bold text-text">
                      {Number(producto.stock_actual).toLocaleString('es-MX')}
                      <span className="ml-1 text-xs font-normal text-text-secondary">{UNIDAD_LABELS[producto.unidad_medida]}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      {puedeGestionarCatalogo && (
                        <button
                          type="button"
                          onClick={() => setProductoParaEtiqueta(producto)}
                          aria-label="Ver etiqueta QR"
                          style={{ minHeight: '44px', minWidth: '44px' }}
                          className="rounded-xl border border-border px-3 text-sm transition hover:border-accent"
                        >
                          🏷️
                        </button>
                      )}
                      {puedeGestionarCatalogo && (
                        <button
                          type="button"
                          onClick={() => handleEliminarProducto(producto)}
                          aria-label="Eliminar producto"
                          style={{ minHeight: '44px', minWidth: '44px' }}
                          className="rounded-xl border border-border px-3 text-sm text-red-400 transition hover:border-red-400 hover:bg-red-500/10"
                        >
                          🗑️
                        </button>
                      )}
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

      {productoParaEtiqueta && (
        <EtiquetaProducto producto={productoParaEtiqueta} onCerrar={() => setProductoParaEtiqueta(null)} />
      )}

      {mostrarEtiquetasUbicacion && ubicacionActiva && (
        <EtiquetasUbicacion
          productos={productosFiltrados}
          ubicacionNombre={UBICACION_LABELS[ubicacionActiva.nombre] ?? ubicacionActiva.nombre_display}
          onCerrar={() => setMostrarEtiquetasUbicacion(false)}
        />
      )}

      {(mostrarAgrupar || grupoParaEditar) && (
        <AgruparMateriales
          grupoExistente={grupoParaEditar}
          onGuardado={handleGrupoGuardado}
          onCerrar={() => { setMostrarAgrupar(false); setGrupoParaEditar(null) }}
        />
      )}

      {grupoParaEtiqueta && (
        <EtiquetaGrupo grupo={grupoParaEtiqueta} onCerrar={() => setGrupoParaEtiqueta(null)} />
      )}
    </div>
  )
}
