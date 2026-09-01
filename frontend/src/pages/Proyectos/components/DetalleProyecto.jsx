import { useCallback, useEffect, useState } from 'react'

import { getProyecto } from '../../../api/proyectos'
import { ESTADO_PROYECTO_CONFIG } from '../constants'
import TabAvances from './Detalle/TabAvances'
import TabCompras from './Detalle/TabCompras'
import TabCotizaciones from './Detalle/TabCotizaciones'
import TabInventario from './Detalle/TabInventario'
import TabResumen from './Detalle/TabResumen'

const TABS = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'cotizaciones', label: 'Cotizaciones' },
  { value: 'compras', label: 'Compras' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'avances', label: 'Avances' },
]

export default function DetalleProyecto({ proyectoId, onVolver }) {
  const [proyecto, setProyecto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('resumen')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getProyecto(proyectoId)
      setProyecto(data)
    } finally {
      setLoading(false)
    }
  }, [proyectoId])

  useEffect(() => { cargar() }, [cargar])

  if (loading || !proyecto) {
    return <p className="text-center text-sm text-text-secondary">Cargando proyecto…</p>
  }

  const cfg = ESTADO_PROYECTO_CONFIG[proyecto.estado] ?? ESTADO_PROYECTO_CONFIG.borrador

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-text-secondary">{proyecto.folio}</p>
            <h2 className="text-xl font-bold text-text">{proyecto.nombre}</h2>
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${cfg.badge}`}>
            {cfg.icon} {cfg.label}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border/40">
          <div
            className="h-full rounded-full bg-highlight transition-all"
            style={{ width: `${proyecto.ultimo_avance ?? 0}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-text-secondary">{proyecto.ultimo_avance ?? 0}% de avance</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              tab === t.value
                ? 'border-highlight bg-highlight/10 text-highlight'
                : 'border-border text-text-secondary hover:border-accent hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && <TabResumen proyecto={proyecto} onActualizado={cargar} onVolver={onVolver} />}
      {tab === 'cotizaciones' && <TabCotizaciones proyecto={proyecto} />}
      {tab === 'compras' && <TabCompras proyecto={proyecto} />}
      {tab === 'inventario' && <TabInventario proyecto={proyecto} />}
      {tab === 'avances' && <TabAvances proyecto={proyecto} onAvanceRegistrado={cargar} />}
    </div>
  )
}
