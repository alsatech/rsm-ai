import { useMemo, useState } from 'react'

import { ESTADO, MODULO_ICON, PRIORIDAD } from '../estadoConfig'

const TABS_ESTADO = [
  { label: 'Todos', value: null, icon: '📋', activeClass: 'border-zinc-400 bg-zinc-800 text-white' },
  { label: 'Abiertos', value: 'abierto' },
  { label: 'En proceso', value: 'en_proceso' },
  { label: 'Bloqueados', value: 'bloqueado' },
  { label: 'Terminados', value: 'cerrado' },
]

const FILTROS_FECHA = [
  { label: 'Todo', value: 'todo' },
  { label: 'Hoy', value: 'hoy' },
  { label: 'Esta semana', value: 'semana' },
  { label: 'Este mes', value: 'mes' },
  { label: 'Rango personalizado', value: 'rango' },
]

const FILTROS_MODULO = [
  { label: 'Todos los módulos', value: null, icon: '🗂️' },
  { label: 'Hidráulica', value: 'hidraulica', icon: '💧' },
  { label: 'Flota', value: 'flota', icon: '🚗' },
  { label: 'Inventario', value: 'inventario', icon: '📦' },
  { label: 'Proyectos', value: 'proyectos', icon: '🏗️' },
  { label: 'Personal', value: 'personal', icon: '👥' },
  { label: 'Sin módulo', value: 'ninguno', icon: '➖' },
]

function fechaEfectiva(p) {
  if (p.fecha_asignacion) return new Date(p.fecha_asignacion + 'T00:00:00')
  return new Date(p.created_at)
}

function aplicarFiltroFecha(pendientes, filtro, rango) {
  if (filtro === 'todo') return pendientes

  if (filtro === 'rango') {
    if (!rango?.desde && !rango?.hasta) return pendientes
    const desde = rango.desde ? new Date(rango.desde + 'T00:00:00') : null
    const hasta = rango.hasta ? new Date(rango.hasta + 'T23:59:59') : null
    return pendientes.filter((p) => {
      const f = fechaEfectiva(p)
      if (desde && f < desde) return false
      if (hasta && f > hasta) return false
      return true
    })
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return pendientes.filter((p) => {
    const f = fechaEfectiva(p)
    if (filtro === 'hoy') return f >= hoy && f < new Date(hoy.getTime() + 86_400_000)
    if (filtro === 'semana') return f >= new Date(hoy.getTime() - 6 * 86_400_000)
    if (filtro === 'mes') return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear()
    return true
  })
}

function PendienteCard({ p, onSeleccionar }) {
  const conf = ESTADO[p.estado] ?? ESTADO.abierto
  const priConf = PRIORIDAD[p.prioridad] ?? PRIORIDAD.media
  const moduloIcon = MODULO_ICON[p.modulo_relacionado]

  const fechaMostrar = p.fecha_asignacion
    ? new Date(p.fecha_asignacion + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
    : null

  return (
    <button
      onClick={() => onSeleccionar(p)}
      style={{ boxShadow: `0 0 16px ${conf.glowRgba}` }}
      className={`w-full rounded-xl border border-l-4 bg-[#080808] p-4 text-left transition-all active:scale-[0.99] ${conf.borderColor} ${conf.borderL}`}
    >
      {/* Título + badges */}
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 truncate text-base font-bold text-white">{p.titulo}</p>
        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
          <span className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-bold ${conf.badge}`}>
            <span>{conf.icon}</span>
            <span>{p.estado_display}</span>
          </span>
          <span className={`rounded px-2 py-0.5 text-sm font-medium ${priConf.badge}`}>
            {priConf.icon} {p.prioridad_display}
          </span>
        </div>
      </div>

      {/* Módulo + asignados */}
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-zinc-400">
        {moduloIcon && p.modulo_relacionado !== 'ninguno' && (
          <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-sm text-zinc-400">
            {moduloIcon} {p.modulo_display}
          </span>
        )}
        <span>👤 {p.asignado_a_detalle?.map((u) => u.nombre).join(', ') || 'Sin asignar'}</span>
      </p>

      {/* Footer: tiempo + fecha origen + bloqueo */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
        <span>📅 {p.dias_abierto}d abierto</span>
        {fechaMostrar && <span className="text-zinc-400">📌 Origen: {fechaMostrar}</span>}
        {p.estado === 'bloqueado' && p.motivo_bloqueo_display && (
          <span className="text-orange-400">⚠ {p.motivo_bloqueo_display}</span>
        )}
      </div>
    </button>
  )
}

export default function VistaListaAdmin({ pendientes, resumen, onSeleccionar, onNuevo }) {
  const [tabEstado, setTabEstado] = useState(null)
  const [filtroFecha, setFiltroFecha] = useState('todo')
  const [filtroModulo, setFiltroModulo] = useState(null)
  const [rangoFechas, setRangoFechas] = useState({ desde: '', hasta: '' })

  const filtrados = useMemo(() => {
    let lista = tabEstado ? pendientes.filter((p) => p.estado === tabEstado) : pendientes
    lista = aplicarFiltroFecha(lista, filtroFecha, rangoFechas)
    if (filtroModulo) lista = lista.filter((p) => p.modulo_relacionado === filtroModulo)
    return lista
  }, [pendientes, tabEstado, filtroFecha, filtroModulo, rangoFechas])

  const conteoEstado = (estado) => {
    const base = estado ? pendientes.filter((p) => p.estado === estado) : pendientes
    let lista = aplicarFiltroFecha(base, filtroFecha, rangoFechas)
    if (filtroModulo) lista = lista.filter((p) => p.modulo_relacionado === filtroModulo)
    return lista.length
  }

  const hayFiltrosActivos = Boolean(
    tabEstado || filtroModulo || filtroFecha !== 'todo'
  )

  const limpiarFiltros = () => {
    setTabEstado(null)
    setFiltroModulo(null)
    setFiltroFecha('todo')
    setRangoFechas({ desde: '', hasta: '' })
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Filtro por estado ── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS_ESTADO.map((tab) => {
          const conf = tab.value ? ESTADO[tab.value] : null
          const isActive = tabEstado === tab.value
          const activeStyle = conf ? conf.tabActive : tab.activeClass
          const activeGlow = conf?.glowRgba
          return (
            <button
              key={tab.value ?? 'todos'}
              onClick={() => setTabEstado(tab.value)}
              style={isActive && activeGlow ? { boxShadow: `0 0 10px ${activeGlow}` } : undefined}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition ${
                isActive
                  ? activeStyle
                  : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
              }`}
            >
              <span>{tab.icon ?? ESTADO[tab.value]?.icon}</span>
              <span>{tab.label}</span>
              <span className="rounded bg-black/50 px-1.5 py-0.5 text-xs font-mono">
                {conteoEstado(tab.value)}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Filtro por módulo ── */}
      <div className="flex items-center gap-2">
        <span className="flex-shrink-0 text-sm text-zinc-600">🗂️ Módulo:</span>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {FILTROS_MODULO.map((m) => (
            <button
              key={m.value ?? 'todos'}
              onClick={() => setFiltroModulo(m.value)}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                filtroModulo === m.value
                  ? 'border-zinc-400 bg-zinc-700 text-white'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Filtro por fecha ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-shrink-0 text-sm text-zinc-600">📅 Período:</span>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {FILTROS_FECHA.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltroFecha(f.value)}
              className={`flex-shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                filtroFecha === f.value
                  ? 'border-zinc-400 bg-zinc-700 text-white'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Contador de resultados */}
        <span className="ml-auto flex-shrink-0 text-sm text-zinc-600">
          {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Rango de fechas personalizado ── */}
      {filtroFecha === 'rango' && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5">
          <label className="flex items-center gap-2 text-sm text-zinc-500">
            Desde
            <input
              type="date"
              value={rangoFechas.desde}
              onChange={(e) => setRangoFechas((prev) => ({ ...prev, desde: e.target.value }))}
              className="rounded-md border border-zinc-700 bg-black px-2 py-1.5 text-sm text-white outline-none focus:border-zinc-400"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-500">
            Hasta
            <input
              type="date"
              value={rangoFechas.hasta}
              onChange={(e) => setRangoFechas((prev) => ({ ...prev, hasta: e.target.value }))}
              className="rounded-md border border-zinc-700 bg-black px-2 py-1.5 text-sm text-white outline-none focus:border-zinc-400"
            />
          </label>
          {(rangoFechas.desde || rangoFechas.hasta) && (
            <button
              onClick={() => setRangoFechas({ desde: '', hasta: '' })}
              className="text-sm text-zinc-500 underline hover:text-white"
            >
              Limpiar rango
            </button>
          )}
        </div>
      )}

      {/* ── Lista ── */}
      {filtrados.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-black p-10 text-center">
          <p className="mb-2 text-3xl">🔍</p>
          <p className="text-base text-zinc-500">Sin pendientes para este filtro.</p>
          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="mt-3 text-sm text-zinc-400 hover:text-white underline"
            >
              Limpiar filtros
            </button>
          )}
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
