import { useState } from 'react'

import { ESTADO, MODULO_ICON, PRIORIDAD } from '../estadoConfig'

const TABS = [
  { label: 'Todos', value: null, icon: '📋', activeClass: 'border-zinc-400 bg-zinc-800 text-white' },
  { label: 'Abiertos', value: 'abierto' },
  { label: 'En proceso', value: 'en_proceso' },
  { label: 'Bloqueados', value: 'bloqueado' },
  { label: 'Cerrados', value: 'cerrado' },
]

function PendienteCard({ p, onSeleccionar }) {
  const conf = ESTADO[p.estado] ?? ESTADO.abierto
  const priConf = PRIORIDAD[p.prioridad] ?? PRIORIDAD.media
  const moduloIcon = MODULO_ICON[p.modulo_relacionado]

  const fechaLimite = p.fecha_limite
    ? new Date(p.fecha_limite + 'T00:00:00').toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short',
      })
    : null

  return (
    <button
      onClick={() => onSeleccionar(p)}
      style={{ boxShadow: `0 0 16px ${conf.glowRgba}` }}
      className={`w-full rounded-xl border border-l-4 bg-[#080808] p-4 text-left transition-all active:scale-[0.99] ${conf.borderColor} ${conf.borderL}`}
    >
      {/* Fila superior: título + badges */}
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 truncate text-base font-bold text-white">{p.titulo}</p>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${conf.badge}`}>
            <span className="text-[10px]">{conf.icon}</span>
            <span>{p.estado_display}</span>
          </span>
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${priConf.badge}`}>
            {priConf.icon} {p.prioridad_display}
          </span>
        </div>
      </div>

      {/* Fila media: módulo + asignados */}
      <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-zinc-500">
        {moduloIcon && p.modulo_relacionado !== 'ninguno' && (
          <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-400">
            {moduloIcon} {p.modulo_display}
          </span>
        )}
        <span>
          👤 {p.asignado_a_detalle?.map((u) => u.nombre).join(', ') || 'Sin asignar'}
        </span>
      </p>

      {/* Fila inferior: tiempo + límite + bloqueo */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-600">
        <span>📅 {p.dias_abierto}d abierto</span>
        {fechaLimite && (
          <span className="text-orange-400">⏰ Límite {fechaLimite}</span>
        )}
        {p.estado === 'bloqueado' && p.motivo_bloqueo_display && (
          <span className="text-orange-400">⚠ {p.motivo_bloqueo_display}</span>
        )}
      </div>
    </button>
  )
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
      {/* Tabs de filtro */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const conf = tab.value ? ESTADO[tab.value] : null
          const isActive = tabActivo === tab.value
          const activeStyle = conf ? conf.tabActive : 'border-zinc-400 bg-zinc-800 text-white'
          const activeGlow = conf ? conf.glowRgba : null
          return (
            <button
              key={tab.value ?? 'todos'}
              onClick={() => setTabActivo(tab.value)}
              style={isActive && activeGlow ? { boxShadow: `0 0 10px ${activeGlow}` } : undefined}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition ${
                isActive
                  ? activeStyle
                  : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
              }`}
            >
              <span>{tab.icon ?? ESTADO[tab.value]?.icon}</span>
              <span>{tab.label}</span>
              <span className="rounded bg-black/50 px-1.5 py-0.5 text-xs font-mono">
                {conteo(tab.value)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Lista de pendientes */}
      {filtrados.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-black p-10 text-center">
          <p className="mb-2 text-3xl">✅</p>
          <p className="text-zinc-500">No hay pendientes en esta categoría.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((p) => (
            <PendienteCard key={p.id} p={p} onSeleccionar={onSeleccionar} />
          ))}
        </div>
      )}

      {/* Botón flotante */}
      <div className="fixed bottom-6 right-6 z-20">
        <button
          onClick={onNuevo}
          style={{ minHeight: '56px', boxShadow: '0 0 20px rgba(74, 222, 128, 0.35)' }}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-base font-bold text-white transition hover:bg-emerald-500"
        >
          + Nuevo pendiente
        </button>
      </div>
    </div>
  )
}
