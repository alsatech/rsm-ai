import { useCallback, useEffect, useMemo, useState } from 'react'

import { getProductos, recalcularClasificacionABC, updateProducto } from '../../../api/inventario'
import { useAuth } from '../../../hooks/useAuth'
import { CLASE_ABC_CONFIG, CRITICIDAD_LABELS } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-highlight'

const ROLES_GESTIONAN_ABC = ['inventario', 'operaciones', 'administrador', 'superadmin']

function formatFechaHora(valor) {
  if (!valor) return 'Sin calcular'
  return new Date(valor).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatMoneda(valor) {
  return Number(valor || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export default function ClasificacionABC({ onVolver }) {
  const { user } = useAuth()
  const puedeGestionar = ROLES_GESTIONAN_ABC.includes(user?.rol)

  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [recalculando, setRecalculando] = useState(false)
  const [filtroClase, setFiltroClase] = useState('')
  const [edicionId, setEdicionId] = useState(null)
  const [formEdicion, setFormEdicion] = useState({ costo_unitario: '', criticidad: 'media' })
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getProductos({ activo: true })
      setProductos(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const conteos = useMemo(() => {
    const base = { A: 0, B: 0, C: 0, sin_calcular: 0 }
    productos.forEach((p) => {
      if (p.clase_abc) base[p.clase_abc] += 1
      else base.sin_calcular += 1
    })
    return base
  }, [productos])

  const productosFiltrados = useMemo(() => {
    if (!filtroClase) return productos
    if (filtroClase === 'sin_calcular') return productos.filter((p) => !p.clase_abc)
    return productos.filter((p) => p.clase_abc === filtroClase)
  }, [productos, filtroClase])

  const handleRecalcular = async () => {
    setRecalculando(true)
    try {
      const { data } = await recalcularClasificacionABC()
      setProductos(data.productos)
    } finally {
      setRecalculando(false)
    }
  }

  const abrirEdicion = (producto) => {
    setEdicionId(producto.id)
    setFormEdicion({ costo_unitario: producto.costo_unitario ?? '0', criticidad: producto.criticidad ?? 'media' })
  }

  const cancelarEdicion = () => {
    setEdicionId(null)
  }

  const guardarEdicion = async (id) => {
    setGuardando(true)
    try {
      const { data } = await updateProducto(id, {
        costo_unitario: formEdicion.costo_unitario,
        criticidad: formEdicion.criticidad,
      })
      setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)))
      setEdicionId(null)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-svh bg-bg pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVolver}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
            >
              ←
            </button>
            <div>
              <h1 className="font-bold text-highlight">Clasificación ABC</h1>
              <p className="text-xs text-text-secondary">Prioriza el control de inventario por valor, uso y criticidad</p>
            </div>
          </div>
          {puedeGestionar && (
            <button
              type="button"
              onClick={handleRecalcular}
              disabled={recalculando}
              style={{ minHeight: '44px' }}
              className="rounded-xl bg-accent px-4 text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
            >
              {recalculando ? 'Recalculando…' : '🎯 Recalcular clasificación ABC'}
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-5">
        <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => setFiltroClase('')}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${filtroClase === '' ? 'border-highlight text-highlight' : 'border-border text-text-secondary hover:border-accent'}`}
          >
            Todas ({productos.length})
          </button>
          {['A', 'B', 'C'].map((clase) => (
            <button
              key={clase}
              type="button"
              onClick={() => setFiltroClase(clase)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${filtroClase === clase ? CLASE_ABC_CONFIG[clase].border + ' ' + CLASE_ABC_CONFIG[clase].text : 'border-border text-text-secondary hover:border-accent'}`}
            >
              {CLASE_ABC_CONFIG[clase].label} ({conteos[clase]})
            </button>
          ))}
          {conteos.sin_calcular > 0 && (
            <button
              type="button"
              onClick={() => setFiltroClase('sin_calcular')}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${filtroClase === 'sin_calcular' ? 'border-text-secondary text-text' : 'border-border text-text-secondary hover:border-accent'}`}
            >
              Sin calcular ({conteos.sin_calcular})
            </button>
          )}
        </div>

        {loading && <p className="text-center text-sm text-text-secondary">Cargando…</p>}

        {!loading && productosFiltrados.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">🎯</span>
            <p className="text-text-secondary">Sin productos que mostrar en este filtro.</p>
          </div>
        )}

        {!loading && productosFiltrados.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-card text-xs text-text-secondary">
                <tr>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Costo unit.</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2">Valor en stock</th>
                  <th className="px-3 py-2">Criticidad</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Clase</th>
                  <th className="px-3 py-2">Última clasificación</th>
                  {puedeGestionar && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productosFiltrados.map((p) => {
                  const config = p.clase_abc ? CLASE_ABC_CONFIG[p.clase_abc] : null
                  const enEdicion = edicionId === p.id
                  return (
                    <tr key={p.id} className="text-text align-top">
                      <td className="px-3 py-2">
                        <p className="font-mono text-xs text-text-secondary">{p.codigo}</p>
                        <p className="font-semibold">{p.descripcion}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {enEdicion ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formEdicion.costo_unitario}
                            onChange={(e) => setFormEdicion((f) => ({ ...f, costo_unitario: e.target.value }))}
                            className={inputClass}
                          />
                        ) : (
                          formatMoneda(p.costo_unitario)
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono">{p.stock_actual}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono">{formatMoneda(p.valor_stock)}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {enEdicion ? (
                          <select
                            value={formEdicion.criticidad}
                            onChange={(e) => setFormEdicion((f) => ({ ...f, criticidad: e.target.value }))}
                            className={inputClass}
                          >
                            {Object.entries(CRITICIDAD_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        ) : (
                          CRITICIDAD_LABELS[p.criticidad] || p.criticidad
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono">{p.score_abc ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {config ? (
                          <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${config.border} ${config.text} ${config.bg}`}>
                            {config.label}
                          </span>
                        ) : (
                          <span className="rounded-full border border-border px-2 py-1 text-xs font-semibold text-text-secondary">
                            Sin calcular
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-text-secondary">{formatFechaHora(p.clasificado_en)}</td>
                      {puedeGestionar && (
                        <td className="whitespace-nowrap px-3 py-2">
                          {enEdicion ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => guardarEdicion(p.id)}
                                disabled={guardando}
                                className="rounded-lg border border-highlight px-2 py-1 text-xs font-semibold text-highlight disabled:opacity-50"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={cancelarEdicion}
                                className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => abrirEdicion(p)}
                              className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary hover:border-accent hover:text-text"
                            >
                              ✏️ Editar
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
