import { useCallback, useEffect, useState } from 'react'

import { getSolicitudes } from '../../../../api/inventario'
import { AREA_LABELS, ESTADO_SOLICITUD_CONFIG, TABS_SOLICITUDES } from '../../constants'

function formatFecha(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ListaSolicitudes({ recargar, onVerSolicitud, onNuevaSolicitud }) {
  const [tab, setTab] = useState('')
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = tab ? { estado: tab } : {}
      const { data } = await getSolicitudes(params)
      setSolicitudes(data)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { cargar() }, [cargar, recargar])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS_SOLICITUDES.map((t) => (
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
        <button
          type="button"
          onClick={onNuevaSolicitud}
          style={{ minHeight: '44px' }}
          className="shrink-0 rounded-xl bg-accent px-4 text-sm font-bold text-highlight transition hover:opacity-90"
        >
          + Nueva solicitud
        </button>
      </div>

      {loading && <p className="text-center text-sm text-text-secondary">Cargando solicitudes…</p>}

      {!loading && solicitudes.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">📦</span>
          <p className="text-text-secondary">Sin solicitudes en este estado.</p>
        </div>
      )}

      {!loading && solicitudes.length > 0 && (
        <div className="flex flex-col gap-3">
          {solicitudes.map((s) => {
            const cfg = ESTADO_SOLICITUD_CONFIG[s.estado] ?? ESTADO_SOLICITUD_CONFIG.borrador
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onVerSolicitud(s.id)}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-accent"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-text-secondary">{s.folio}</p>
                    <p className="font-bold text-text">{AREA_LABELS[s.area]}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-text-secondary">{s.descripcion_necesidad}</p>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>{s.solicitante_detalle?.nombre}</span>
                  <span>
                    {s.items?.length ?? 0} ítem{(s.items?.length ?? 0) !== 1 ? 's' : ''}
                    {s.fecha_requerida ? ` · requerido ${formatFecha(s.fecha_requerida)}` : ''}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
