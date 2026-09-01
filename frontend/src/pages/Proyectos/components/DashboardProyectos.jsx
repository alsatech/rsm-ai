import { useCallback, useEffect, useState } from 'react'

import { getProyectos } from '../../../api/proyectos'
import { ESTADO_PROYECTO_CONFIG, TABS_ESTADO_PROYECTO, formatFecha, formatMoneda } from '../constants'
import FormularioProyecto from './FormularioProyecto'

const CARDS_ESTADO = ['borrador', 'autorizado', 'en_progreso', 'pausado', 'completado']

export default function DashboardProyectos({ recargar, esSuperadmin, onVerProyecto }) {
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('')
  const [mostrarNuevo, setMostrarNuevo] = useState(false)
  const [recargaLocal, setRecargaLocal] = useState(0)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getProyectos(tab ? { estado: tab } : {})
      setProyectos(data)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { cargar() }, [cargar, recargar, recargaLocal])

  const contarEstado = (estado) => proyectos.filter((p) => p.estado === estado).length

  if (mostrarNuevo) {
    return (
      <FormularioProyecto
        onCancelar={() => setMostrarNuevo(false)}
        onCreado={() => {
          setMostrarNuevo(false)
          setRecargaLocal((r) => r + 1)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CARDS_ESTADO.map((estado) => {
          const cfg = ESTADO_PROYECTO_CONFIG[estado]
          return (
            <button
              key={estado}
              type="button"
              onClick={() => setTab(tab === estado ? '' : estado)}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                tab === estado ? 'border-highlight bg-highlight/10' : 'border-border bg-card hover:border-accent'
              }`}
            >
              <p className="text-2xl">{cfg.icon}</p>
              <p className="mt-2 text-2xl font-bold text-text">{contarEstado(estado)}</p>
              <p className="text-xs text-text-secondary">{cfg.label}</p>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS_ESTADO_PROYECTO.map((t) => (
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
        {esSuperadmin && (
          <button
            type="button"
            onClick={() => setMostrarNuevo(true)}
            style={{ minHeight: '44px' }}
            className="shrink-0 rounded-xl bg-accent px-4 text-sm font-bold text-highlight transition hover:opacity-90"
          >
            + Nuevo proyecto
          </button>
        )}
      </div>

      {loading && <p className="text-center text-sm text-text-secondary">Cargando proyectos…</p>}

      {!loading && proyectos.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🏗️</span>
          <p className="text-text-secondary">Sin proyectos en este estado.</p>
        </div>
      )}

      {!loading && proyectos.length > 0 && (
        <div className="flex flex-col gap-3">
          {proyectos.map((p) => {
            const cfg = ESTADO_PROYECTO_CONFIG[p.estado] ?? ESTADO_PROYECTO_CONFIG.borrador
            const pendienteAutorizacion = p.requiere_autorizacion && p.estado === 'borrador'
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onVerProyecto(p.id)}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-accent"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-text-secondary">{p.folio}</p>
                    <p className="font-bold text-text">{p.nombre}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${cfg.badge}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    {pendienteAutorizacion && (
                      <span className="animate-pulse rounded-full border border-error bg-error/20 px-2.5 py-0.5 text-[10px] font-bold text-error">
                        ⚠️ Requiere autorización
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
                  <div
                    className="h-full rounded-full bg-highlight transition-all"
                    style={{ width: `${p.ultimo_avance ?? 0}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-text-secondary">
                  <span>Asignado: {p.asignado_a_detalle?.nombre}</span>
                  <span>{formatMoneda(p.presupuesto_total)}</span>
                  <span>{p.ultimo_avance ?? 0}% avance</span>
                  {p.fecha_inicio_estimada && <span>Inicio: {formatFecha(p.fecha_inicio_estimada)}</span>}
                  {p.fecha_fin_estimada && <span>Fin: {formatFecha(p.fecha_fin_estimada)}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
