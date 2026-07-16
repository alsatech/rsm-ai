import { useCallback, useEffect, useState } from 'react'

import { getAlertasStock, getCategorias, getProductos } from '../../../api/inventario'
import { useAuth } from '../../../hooks/useAuth'
import PanelAlertasStock from './PanelAlertasStock'
import ResumenInventario from './ResumenInventario'

export default function DashboardInventario({ recargar, onVerProductos }) {
  const { user } = useAuth()
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [tabActiva, setTabActiva] = useState(null) // null = "Todos"

  const puedeVerAlertas = ['operaciones', 'inventario', 'administrador', 'superadmin'].includes(user?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [cats, prods] = await Promise.all([getCategorias(), getProductos({ activo: true })])
      setCategorias(cats.data)
      setProductos(prods.data)
    } finally {
      setLoading(false)
    }
  }, [])

  const cargarAlertas = useCallback(async () => {
    if (!puedeVerAlertas) return
    try {
      const { data } = await getAlertasStock()
      setAlertas(data)
    } catch {
      setAlertas([])
    }
  }, [puedeVerAlertas])

  useEffect(() => { cargar() }, [cargar, recargar])
  useEffect(() => { cargarAlertas() }, [cargarAlertas, recargar])

  const categoriasVisibles = tabActiva
    ? categorias.filter((c) => c.id === tabActiva)
    : categorias

  const contarProductos = (categoriaId) => productos.filter((p) => p.categoria === categoriaId).length
  const contarAlertas = (categoriaId) => alertas.filter((p) => p.categoria === categoriaId).length

  return (
    <div className="grid grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setTabActiva(null)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              tabActiva === null
                ? 'border-highlight bg-highlight/10 text-highlight'
                : 'border-border text-text-secondary hover:border-accent hover:text-text'
            }`}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setTabActiva(cat.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                tabActiva === cat.id
                  ? 'border-highlight bg-highlight/10 text-highlight'
                  : 'border-border text-text-secondary hover:border-accent hover:text-text'
              }`}
            >
              {cat.icono} {cat.nombre}
            </button>
          ))}
        </div>

        {loading && <p className="text-center text-sm text-text-secondary">Cargando inventario…</p>}

        {!loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {categoriasVisibles.map((cat) => {
              const total = contarProductos(cat.id)
              const enAlerta = contarAlertas(cat.id)
              return (
                <div
                  key={cat.id}
                  className="rounded-2xl border-2 border-border bg-card p-5 transition hover:border-accent"
                  style={{ borderLeftColor: cat.color, borderLeftWidth: '4px' }}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-3xl">{cat.icono}</p>
                      <p className="mt-1 font-bold text-text">{cat.nombre}</p>
                    </div>
                    {enAlerta > 0 && (
                      <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-error px-2 text-xs font-bold text-white">
                        {enAlerta}
                      </span>
                    )}
                  </div>

                  <p className="mb-4 font-mono text-sm text-text-secondary">
                    {total} producto{total !== 1 ? 's' : ''}
                  </p>

                  <button
                    type="button"
                    onClick={() => onVerProductos(cat.id)}
                    style={{ minHeight: '48px' }}
                    className="w-full rounded-xl border border-accent text-sm font-bold text-highlight transition hover:bg-accent"
                  >
                    Ver productos
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {puedeVerAlertas && (
        <div className="flex flex-col gap-4">
          <ResumenInventario recargar={recargar} />
          <PanelAlertasStock alertas={alertas} />
        </div>
      )}
    </div>
  )
}
