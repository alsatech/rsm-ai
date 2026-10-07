import { useCallback, useEffect, useState } from 'react'

import { getAlertasStock, getProductos, getUbicaciones } from '../../../api/inventario'
import { useAuth } from '../../../hooks/useAuth'
import { UBICACION_ICONS, UBICACION_LABELS } from '../constants'
import PanelAlertasStock from './PanelAlertasStock'
import ResumenInventario from './ResumenInventario'

export default function DashboardInventario({ recargar, onVerUbicacion, onSolicitarMaterial, onImprimirEtiquetas }) {
  const { user } = useAuth()
  const [ubicaciones, setUbicaciones] = useState([])
  const [productos, setProductos] = useState([])
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)

  const puedeVerAlertas = ['operaciones', 'inventario', 'administrador', 'superadmin'].includes(user?.rol)
  const puedeGestionarCatalogo = ['inventario', 'administrador', 'superadmin'].includes(user?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [ubis, prods] = await Promise.all([getUbicaciones(), getProductos({ activo: true })])
      setUbicaciones(ubis.data)
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

  const contarProductos = (ubicacionId) => productos.filter((p) => p.ubicacion === ubicacionId).length
  const contarAlertas = (ubicacionId) => alertas.filter((p) => p.ubicacion === ubicacionId).length

  return (
    <div className="grid grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
      <div>
        {loading && <p className="text-center text-sm text-text-secondary">Cargando inventario…</p>}

        {!loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ubicaciones.map((u) => {
              const total = contarProductos(u.id)
              const enAlerta = contarAlertas(u.id)
              return (
                <div
                  key={u.id}
                  className="rounded-2xl border-2 border-border bg-card p-5 transition hover:border-accent"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-3xl">{UBICACION_ICONS[u.nombre] ?? '📍'}</p>
                      <p className="mt-1 font-bold text-text">{UBICACION_LABELS[u.nombre] ?? u.nombre_display}</p>
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
                    onClick={() => onVerUbicacion(u.id)}
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

      {(puedeVerAlertas || puedeGestionarCatalogo) && (
        <div className="flex flex-col gap-4">
          {puedeVerAlertas && (
            <>
              <ResumenInventario recargar={recargar} />
              <PanelAlertasStock alertas={alertas} onSolicitar={onSolicitarMaterial} />
            </>
          )}
          {puedeGestionarCatalogo && (
            <button
              type="button"
              onClick={onImprimirEtiquetas}
              style={{ minHeight: '48px' }}
              className="w-full rounded-xl border border-dashed border-accent text-sm font-semibold text-highlight transition hover:bg-card"
            >
              🏷️ Etiquetas de ubicación
            </button>
          )}
        </div>
      )}
    </div>
  )
}
