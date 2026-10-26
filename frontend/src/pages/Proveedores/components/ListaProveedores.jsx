import { useCallback, useEffect, useState } from 'react'

import { getProveedores } from '../../../api/proveedores'
import { TABS_TIPO_PROVEEDOR, TIPO_PROVEEDOR_CONFIG } from '../constants'

export default function ListaProveedores({ recargar, puedeEditar, onEditar }) {
  const [tab, setTab] = useState('')
  const [q, setQ] = useState('')
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = { activo: true }
      if (tab) params.tipo = tab
      if (q) params.q = q
      const { data } = await getProveedores(params)
      setProveedores(data)
    } finally {
      setLoading(false)
    }
  }, [tab, q])

  useEffect(() => { cargar() }, [cargar, recargar])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS_TIPO_PROVEEDOR.map((t) => (
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

      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre, empresa o especialidad…"
        className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight"
      />

      {loading && <p className="text-center text-sm text-text-secondary">Cargando proveedores…</p>}

      {!loading && proveedores.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🧰</span>
          <p className="text-text-secondary">Sin proveedores en este filtro.</p>
        </div>
      )}

      {!loading && proveedores.length > 0 && (
        <div className="flex flex-col gap-3">
          {proveedores.map((p) => {
            const cfg = TIPO_PROVEEDOR_CONFIG[p.tipo] ?? TIPO_PROVEEDOR_CONFIG.otro
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => puedeEditar && onEditar(p)}
                disabled={!puedeEditar}
                className={`flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-left transition ${
                  puedeEditar ? 'hover:border-accent' : 'cursor-default'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-text">{cfg.icon} {p.nombre}</p>
                    {p.empresa && <p className="text-sm text-text-secondary">{p.empresa}</p>}
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-bold text-text-secondary">
                    {cfg.label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                  {p.especialidad && <span>{p.especialidad}</span>}
                  {p.ciudad && <span>📍 {p.ciudad}{p.pais ? `, ${p.pais}` : ''}</span>}
                  {p.telefono && <span>📞 {p.telefono}</span>}
                  {p.trabajo_antes && <span className="text-highlight">✓ Ya trabajó con nosotros</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
