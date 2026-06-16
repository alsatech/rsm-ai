import { useState } from 'react'

const TABS = [
  { label: 'Todos', value: null },
  { label: 'Abiertos', value: 'abierto' },
  { label: 'En proceso', value: 'en_proceso' },
  { label: 'Bloqueados', value: 'bloqueado' },
  { label: 'Cerrados', value: 'cerrado' },
]

const BADGE_ESTADO = {
  abierto: 'bg-error/20 text-error',
  en_proceso: 'bg-warning/20 text-warning',
  bloqueado: 'bg-orange-500/20 text-orange-400',
  cerrado: 'bg-highlight/20 text-highlight',
}

const BADGE_PRIORIDAD = {
  baja: 'bg-border text-text-secondary',
  media: 'bg-warning/20 text-warning',
  alta: 'bg-error/20 text-error',
  urgente: 'bg-error text-bg animate-pulse',
}

export default function VistaListaAdmin({ pendientes, resumen, onSeleccionar, onNuevo }) {
  const [tabActivo, setTabActivo] = useState(null)

  const filtrados = tabActivo
    ? pendientes.filter((p) => p.estado === tabActivo)
    : pendientes

  const conteo = (estado) => {
    if (!estado) return resumen?.total ?? pendientes.length
    return resumen?.[estado] ?? pendientes.filter((p) => p.estado === estado).length
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.value ?? 'todos'}
            onClick={() => setTabActivo(tab.value)}
            className={`flex-shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              tabActivo === tab.value
                ? 'border-highlight bg-accent text-highlight'
                : 'border-border text-text-secondary hover:border-highlight'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 rounded-full bg-bg px-1.5 py-0.5 text-xs font-mono">
              {conteo(tab.value)}
            </span>
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="mb-2 text-3xl">✅</p>
          <p className="text-text-secondary">No hay pendientes en esta categoría.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((p) => (
            <button
              key={p.id}
              onClick={() => onSeleccionar(p)}
              className={`w-full rounded-xl border p-4 text-left transition hover:border-highlight ${
                p.estado === 'bloqueado'
                  ? 'border-orange-500/40 bg-orange-500/5 hover:border-orange-400'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-text">{p.titulo}</p>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {p.modulo_display !== 'Ninguno' && (
                      <span className="mr-2 rounded bg-border/50 px-1.5 py-0.5 text-xs">
                        {p.modulo_display}
                      </span>
                    )}
                    {p.asignado_a_detalle?.map((u) => u.nombre).join(', ') || 'Sin asignar'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${BADGE_ESTADO[p.estado]}`}
                  >
                    {p.estado_display}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${BADGE_PRIORIDAD[p.prioridad]}`}>
                    {p.prioridad_display}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-secondary">
                <span>
                  {p.dias_abierto} día{p.dias_abierto !== 1 ? 's' : ''} abierto
                </span>
                {p.fecha_limite && (
                  <span>
                    Límite: {new Date(p.fecha_limite).toLocaleDateString('es-MX')}
                  </span>
                )}
                {p.estado === 'bloqueado' && p.motivo_bloqueo_display && (
                  <span className="text-orange-400">⚠ {p.motivo_bloqueo_display}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-20">
        <button
          onClick={onNuevo}
          style={{ minHeight: '56px' }}
          className="rounded-xl bg-accent px-6 py-3 text-base font-bold text-text shadow-lg transition hover:bg-highlight hover:text-bg"
        >
          + Nuevo pendiente
        </button>
      </div>
    </div>
  )
}
