import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'

import {
  crearSpotAsignacion,
  desactivarSpotAsignacion,
  getCorraletas,
  getRecorridos,
  getSpotAlertas,
  getSpotAsignaciones,
  getSpotEstado,
  getSpotPosiciones,
  resolverSpotAlerta,
} from '../../api/ganado'
import CapaCercas from '../../components/mapa/CapaCercas'
import { CERCAS_RANCHO } from '../../constants/cercasRancho'
import { useCercasVisibles } from '../../hooks/useCercasVisibles'
import { useToast } from '../../hooks/useToast'

// 🧪 Modo pruebas — dispositivo en El Paso, TX mientras se prueba el hardware
// fuera del rancho. Poner en false para volver a operación normal.
const MODO_PRUEBAS = true

const CENTER = MODO_PRUEBAS ? [31.821106658459094, -106.54663358816666] : [29.515, -101.545]
const ZOOM = 12
const REFRESH_MS = 5 * 60 * 1000
const TICK_MS = 30 * 1000

const PERIMETRO_SANTA_MARGARITA = CERCAS_RANCHO.find((c) => c.nombre === 'SantaMargarita')?.coordenadas ?? []

const BATERIA_CONFIG = {
  GOOD: { label: 'Buena', icon: '🟢', bg: 'bg-accent', text: 'text-highlight', border: 'border-highlight' },
  LOW: { label: 'Baja', icon: '🟡', bg: 'bg-card', text: 'text-warning', border: 'border-warning' },
  CRITICAL: { label: 'Crítica', icon: '🔴', bg: 'bg-card', text: 'text-error', border: 'border-error' },
}

const TIPO_ALERTA_LABEL = {
  sin_senal: 'Sin señal',
  fuera_perimetro: 'Fuera del perímetro',
  bateria_baja: 'Batería baja',
  bateria_critica: 'Batería crítica',
}

function hoyISO() {
  return new Date().toISOString().split('T')[0]
}

function horaLocal(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fechaHoraLocal(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function minutosDesde(iso, ahora) {
  if (!iso) return null
  return Math.max(0, Math.round((ahora.getTime() - new Date(iso).getTime()) / 60000))
}

function textoMinutos(minutos) {
  if (minutos === null) return 'sin datos'
  if (minutos < 1) return 'hace instantes'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  return `hace ${horas}h ${minutos % 60}min`
}

const iconoUltimaPosicion = L.divIcon({
  className: '',
  html: '<div class="spot-marker-pulse"></div><div class="spot-marker-dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const iconoFueraPerimetro = L.divIcon({
  className: '',
  html: '<div class="spot-marker-alerta">⚠️</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

// SPOT reporta lat/lng -99999 cuando el mensaje no trae fix GPS (p.ej. POWER-OFF).
// Esas coordenadas centinela rompen el fitBounds del mapa (fuerza el zoom al mínimo).
function tieneCoordenadaValida(p) {
  const lat = parseFloat(p.lat)
  const lng = parseFloat(p.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

function AjustarVista({ posiciones }) {
  const map = useMap()
  useEffect(() => {
    if (!posiciones.length) return
    const bounds = L.latLngBounds(posiciones.map((p) => [parseFloat(p.lat), parseFloat(p.lng)]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
  }, [map, posiciones])
  return null
}

function descargarCSV(posiciones) {
  const filas = [
    ['hora', 'lat', 'lng', 'bateria', 'tipo_mensaje', 'dentro_perimetro'],
    ...posiciones.map((p) => [
      fechaHoraLocal(p.fecha_hora_spot),
      p.lat,
      p.lng,
      p.bateria,
      p.message_type,
      p.dentro_perimetro ? 'dentro' : 'fuera',
    ]),
  ]
  const csv = filas.map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `spot-trace-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

export default function SpotTrace() {
  const { showToast } = useToast()
  const [cercasVisibles, toggleCercas] = useCercasVisibles()
  const [rastroVisible, setRastroVisible] = useState(true)
  const [corraletasVisibles, setCorraletasVisibles] = useState(true)

  const [fecha, setFecha] = useState(hoyISO())
  const [estado, setEstado] = useState(null)
  const [alertas, setAlertas] = useState([])
  const [posiciones, setPosiciones] = useState([])
  const [corraletas, setCorraletas] = useState([])
  const [recorridosHoy, setRecorridosHoy] = useState([])
  const [historialAsignaciones, setHistorialAsignaciones] = useState([])
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState(null)

  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null)
  const [ahora, setAhora] = useState(new Date())

  const [formAsignacion, setFormAsignacion] = useState({ nombre: '', recorrido: '', notas: '' })
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false)

  const fechaRef = useRef(fecha)
  useEffect(() => {
    fechaRef.current = fecha
  }, [fecha])

  const asignacionRef = useRef(null)
  useEffect(() => {
    asignacionRef.current = asignacionSeleccionada?.id ?? null
  }, [asignacionSeleccionada])

  const cargarDatos = useCallback(async ({ mostrarSpinner } = {}) => {
    if (mostrarSpinner) setActualizando(true)
    try {
      const paramsPosiciones = asignacionRef.current
        ? { asignacion: asignacionRef.current }
        : { fecha: fechaRef.current }
      const [estadoResp, alertasResp, posicionesResp] = await Promise.all([
        getSpotEstado(),
        getSpotAlertas(),
        getSpotPosiciones(paramsPosiciones),
      ])
      setEstado(estadoResp.data)
      setAlertas(alertasResp.data)
      setPosiciones(posicionesResp.data)
      setUltimaActualizacion(new Date())
    } catch {
      showToast('No se pudo actualizar el estado de SPOT Trace.', 'error')
    } finally {
      setActualizando(false)
      setCargando(false)
    }
  }, [showToast])

  const cargarHistorial = useCallback(() => {
    getSpotAsignaciones().then(({ data }) => setHistorialAsignaciones(data)).catch(() => {})
  }, [])

  useEffect(() => {
    getCorraletas().then(({ data }) => setCorraletas(data)).catch(() => {})
    getRecorridos({ fecha: hoyISO() }).then(({ data }) => setRecorridosHoy(data)).catch(() => {})
    cargarHistorial()
  }, [cargarHistorial])

  useEffect(() => {
    setCargando(true)
    cargarDatos()
  }, [fecha, asignacionSeleccionada, cargarDatos])

  const handleSeleccionarAsignacion = (a) => {
    setAsignacionSeleccionada((prev) => (prev?.id === a.id ? null : { id: a.id, nombre: a.nombre || 'Sin nombre' }))
  }

  const handleLimpiarSeleccion = () => setAsignacionSeleccionada(null)

  useEffect(() => {
    const interval = setInterval(() => cargarDatos({ mostrarSpinner: true }), REFRESH_MS)
    return () => clearInterval(interval)
  }, [cargarDatos])

  useEffect(() => {
    const interval = setInterval(() => setAhora(new Date()), TICK_MS)
    return () => clearInterval(interval)
  }, [])

  const minutosSinSenal = minutosDesde(estado?.ultima_posicion?.fecha_hora_spot, ahora)
  const bateriaInfo = estado?.ultima_posicion
    ? BATERIA_CONFIG[estado.ultima_posicion.bateria] ?? BATERIA_CONFIG.GOOD
    : null
  const fueraDePerimetro = !MODO_PRUEBAS && estado?.ultima_posicion && !estado.ultima_posicion.dentro_perimetro
  const posicionesConFix = useMemo(() => posiciones.filter(tieneCoordenadaValida), [posiciones])
  const posicionesFuera = MODO_PRUEBAS ? [] : posicionesConFix.filter((p) => !p.dentro_perimetro)
  const ultimaPosicionHoy = posicionesConFix.length ? posicionesConFix[posicionesConFix.length - 1] : null
  const alertasVisibles = MODO_PRUEBAS ? alertas.filter((a) => a.tipo !== 'fuera_perimetro') : alertas

  const handleActivarAsignacion = async (e) => {
    e.preventDefault()
    if (!formAsignacion.nombre.trim()) {
      showToast('Ponle un nombre a la asignación para identificar la prueba.', 'alerta')
      return
    }
    setGuardandoAsignacion(true)
    try {
      await crearSpotAsignacion({
        nombre: formAsignacion.nombre.trim(),
        recorrido: formAsignacion.recorrido || null,
        notas: formAsignacion.notas,
      })
      setFormAsignacion({ nombre: '', recorrido: '', notas: '' })
      showToast('Rastreo SPOT activado.', 'exito')
      cargarDatos()
      cargarHistorial()
    } catch {
      showToast('No se pudo activar el rastreo.', 'error')
    } finally {
      setGuardandoAsignacion(false)
    }
  }

  const handleCerrarAsignacion = async () => {
    if (!estado?.asignacion_activa) return
    try {
      await desactivarSpotAsignacion(estado.asignacion_activa.id)
      showToast('Asignación cerrada.', 'exito')
      cargarDatos()
      cargarHistorial()
    } catch {
      showToast('No se pudo cerrar la asignación.', 'error')
    }
  }

  const handleResolverAlerta = async (id) => {
    try {
      await resolverSpotAlerta(id)
      setAlertas((prev) => prev.filter((a) => a.id !== id))
      showToast('Alerta resuelta.', 'exito')
    } catch {
      showToast('No se pudo resolver la alerta.', 'error')
    }
  }

  const opcionesRecorrido = useMemo(
    () =>
      recorridosHoy.map((r) => ({
        id: r.id,
        label: `${r.fecha} — ${r.responsable_detalle?.nombre || 'Recorrido'} (${r.estado_display})`,
      })),
    [recorridosHoy],
  )

  return (
    <div className="min-h-svh bg-bg px-4 py-4">
      <style>{`
        .spot-marker-dot {
          position: absolute; inset: 4px; border-radius: 50%;
          background: #4ade80; border: 2px solid #0a0f0d;
        }
        .spot-marker-pulse {
          position: absolute; inset: -4px; border-radius: 50%;
          background: rgba(74, 222, 128, 0.4);
          animation: flotaPulse 1.6s ease-in-out infinite;
        }
        .spot-marker-alerta {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; font-size: 20px;
          filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.9));
        }
      `}</style>

      {MODO_PRUEBAS && (
        <div className="mb-4 rounded-2xl border-2 border-warning bg-card px-4 py-3 text-center text-sm font-bold text-warning">
          🧪 Modo pruebas activo — El Paso, TX
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Columna izquierda — panel de estado */}
        <aside className="w-full shrink-0 space-y-4 lg:w-80">
          {/* Estado del dispositivo */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-wide text-text-secondary">Estado del dispositivo</p>
              <button
                type="button"
                onClick={() => cargarDatos({ mostrarSpinner: true })}
                disabled={actualizando}
                className="rounded-lg border border-border px-2 py-1 text-xs font-semibold text-text-secondary transition hover:border-accent disabled:opacity-50"
              >
                {actualizando ? '...' : '🔄'}
              </button>
            </div>

            {cargando ? (
              <p className="text-sm text-text-secondary">Cargando...</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="font-bold text-highlight">RSM2026 🛰️</p>
                {!estado?.asignacion_activa && estado?.ultima_posicion && (
                  <p className="rounded-lg border border-warning/40 bg-warning/10 px-2 py-1.5 text-xs font-semibold text-warning">
                    ⏸️ Rastreo pausado (sin asignación activa) — mostrando la última posición conocida
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Última señal</span>
                  <span className="font-mono text-text">{textoMinutos(minutosSinSenal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Batería</span>
                  {bateriaInfo ? (
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${bateriaInfo.bg} ${bateriaInfo.text} ${bateriaInfo.border}`}>
                      {bateriaInfo.icon} {bateriaInfo.label}
                    </span>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Perímetro</span>
                  <span className={fueraDePerimetro ? 'font-bold text-error' : 'font-bold text-highlight'}>
                    {estado?.ultima_posicion ? (fueraDePerimetro ? '⚠️ FUERA' : '✅ Sí') : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Posiciones hoy</span>
                  <span className="font-mono text-text">{estado?.total_posiciones_hoy ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Asignación</span>
                  <span className="text-right text-text">
                    {estado?.asignacion_activa
                      ? (estado.asignacion_activa.recorrido_fecha
                        ? `Recorrido ${estado.asignacion_activa.recorrido_fecha}`
                        : 'Sin recorrido vinculado')
                      : 'Sin asignación activa'}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => cargarDatos({ mostrarSpinner: true })}
              disabled={actualizando}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-highlight py-2 text-sm font-bold text-highlight transition hover:bg-accent disabled:opacity-50"
            >
              {actualizando ? 'Actualizando...' : '↻ Actualizar ahora'}
            </button>
            {ultimaActualizacion && (
              <p className="mt-2 text-center text-xs text-text-secondary">
                Última actualización: {horaLocal(ultimaActualizacion.toISOString())}
              </p>
            )}
          </div>

          {/* Alertas activas */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-text-secondary">
              Alertas activas
              {alertasVisibles.length > 0 && (
                <span className="rounded-full bg-error px-2 py-0.5 text-xs font-bold text-bg">{alertasVisibles.length}</span>
              )}
            </p>
            {alertasVisibles.length === 0 ? (
              <p className="text-sm text-text-secondary">✅ Sin alertas activas</p>
            ) : (
              <div className="space-y-2">
                {alertasVisibles.map((a) => (
                  <div key={a.id} className="rounded-xl border border-error/40 bg-bg p-3">
                    <p className="text-xs font-bold uppercase text-error">{TIPO_ALERTA_LABEL[a.tipo] ?? a.tipo}</p>
                    <p className="mt-1 text-sm text-text">{a.mensaje}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-text-secondary">{fechaHoraLocal(a.created_at)}</span>
                      <button
                        type="button"
                        onClick={() => handleResolverAlerta(a.id)}
                        className="rounded-lg border border-highlight px-2 py-1 text-xs font-bold text-highlight transition hover:bg-accent"
                      >
                        Resolver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Asignación */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-text-secondary">Asignación</p>
            {estado?.asignacion_activa ? (
              <div className="space-y-3 text-sm">
                <p className="font-bold text-highlight">{estado.asignacion_activa.nombre || 'Sin nombre'}</p>
                <p className="text-text">
                  {estado.asignacion_activa.recorrido_fecha
                    ? `Vinculada al recorrido del ${estado.asignacion_activa.recorrido_fecha}`
                    : 'Rastreo activo sin recorrido vinculado'}
                </p>
                {estado.asignacion_activa.notas && (
                  <p className="text-text-secondary">📝 {estado.asignacion_activa.notas}</p>
                )}
                <p className="text-xs text-text-secondary">
                  Iniciada: {fechaHoraLocal(estado.asignacion_activa.fecha_inicio)}
                </p>
                <button
                  type="button"
                  onClick={handleCerrarAsignacion}
                  className="w-full rounded-xl border-2 border-error py-2 text-sm font-bold text-error transition hover:bg-error/10"
                >
                  Cerrar asignación
                </button>
              </div>
            ) : (
              <form onSubmit={handleActivarAsignacion} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">
                    Nombre de la prueba
                  </label>
                  <input
                    type="text"
                    value={formAsignacion.nombre}
                    onChange={(e) => setFormAsignacion((f) => ({ ...f, nombre: e.target.value }))}
                    required
                    placeholder="Ej. Prueba 3 — salida al patio"
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-highlight"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">
                    Recorrido (opcional)
                  </label>
                  <select
                    value={formAsignacion.recorrido}
                    onChange={(e) => setFormAsignacion((f) => ({ ...f, recorrido: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-highlight"
                  >
                    <option value="">Sin vincular</option>
                    {opcionesRecorrido.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Notas</label>
                  <textarea
                    value={formAsignacion.notas}
                    onChange={(e) => setFormAsignacion((f) => ({ ...f, notas: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-highlight"
                    placeholder="Opcional"
                  />
                </div>
                <button
                  type="submit"
                  disabled={guardandoAsignacion}
                  className="w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
                >
                  {guardandoAsignacion ? 'Activando...' : 'Activar rastreo'}
                </button>
              </form>
            )}

            {historialAsignaciones.filter((a) => !a.activa).length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">
                  Historial de pruebas
                </p>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {historialAsignaciones.filter((a) => !a.activa).map((a) => {
                    const seleccionada = asignacionSeleccionada?.id === a.id
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => handleSeleccionarAsignacion(a)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                          seleccionada
                            ? 'border-highlight bg-highlight/10'
                            : 'border-border bg-bg hover:border-accent'
                        }`}
                      >
                        <p className="font-semibold text-text">
                          {seleccionada && '🎯 '}{a.nombre || 'Sin nombre'}
                        </p>
                        <p className="mt-0.5 text-text-secondary">
                          {fechaHoraLocal(a.fecha_inicio)} — {a.fecha_fin ? fechaHoraLocal(a.fecha_fin) : 'en curso'}
                        </p>
                        {a.notas && <p className="mt-0.5 text-text-secondary">📝 {a.notas}</p>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Columna derecha — mapa */}
        <div className="min-w-0 flex-1 space-y-4">
          <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: '500px', height: '65svh' }}>
            {/* Selector de fecha / prueba seleccionada */}
            <div className="absolute left-2 top-2 z-[1000]">
              {asignacionSeleccionada ? (
                <button
                  type="button"
                  onClick={handleLimpiarSeleccion}
                  className="flex items-center gap-2 rounded-lg border-2 border-highlight bg-bg/90 px-2 py-1.5 text-xs font-bold text-highlight backdrop-blur-sm"
                >
                  🎯 {asignacionSeleccionada.nombre} <span className="text-text-secondary">✕</span>
                </button>
              ) : (
                <input
                  type="date"
                  value={fecha}
                  max={hoyISO()}
                  onChange={(e) => setFecha(e.target.value)}
                  className="rounded-lg border-2 border-border bg-bg/90 px-2 py-1.5 text-xs font-semibold text-text outline-none backdrop-blur-sm focus:border-highlight"
                />
              )}
            </div>

            {/* Toggles */}
            <div className="absolute right-2 top-2 z-[1000] flex flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={() => setRastroVisible((v) => !v)}
                className={`rounded-lg border-2 px-3 py-1.5 text-xs font-bold backdrop-blur-sm transition ${
                  rastroVisible
                    ? 'border-highlight bg-highlight/20 text-highlight'
                    : 'border-border bg-bg/80 text-text-secondary hover:border-accent'
                }`}
              >
                🛰️ Rastro SPOT
              </button>
              <button
                type="button"
                onClick={toggleCercas}
                className={`rounded-lg border-2 px-3 py-1.5 text-xs font-bold backdrop-blur-sm transition ${
                  cercasVisibles
                    ? 'border-highlight bg-highlight/20 text-highlight'
                    : 'border-border bg-bg/80 text-text-secondary hover:border-accent'
                }`}
              >
                🔲 Cercas
              </button>
              <button
                type="button"
                onClick={() => setCorraletasVisibles((v) => !v)}
                className={`rounded-lg border-2 px-3 py-1.5 text-xs font-bold backdrop-blur-sm transition ${
                  corraletasVisibles
                    ? 'border-highlight bg-highlight/20 text-highlight'
                    : 'border-border bg-bg/80 text-text-secondary hover:border-accent'
                }`}
              >
                🐄 Corraletas
              </button>
            </div>

            {actualizando && (
              <div className="absolute bottom-2 left-2 z-[1000] rounded-lg border border-highlight bg-bg/90 px-3 py-1.5 text-xs font-bold text-highlight backdrop-blur-sm">
                Actualizando...
              </div>
            )}

            <MapContainer center={CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='Tiles &copy; <a href="https://www.esri.com">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />

              <AjustarVista posiciones={posicionesConFix} />

              {PERIMETRO_SANTA_MARGARITA.length > 0 && (
                <Polygon
                  positions={PERIMETRO_SANTA_MARGARITA}
                  pathOptions={{ color: '#FFA500', weight: 4, fillOpacity: 0 }}
                />
              )}

              {cercasVisibles && <CapaCercas />}

              {corraletasVisibles && corraletas.map((c) => (
                <CircleMarker
                  key={c.id}
                  center={[parseFloat(c.lat), parseFloat(c.lng)]}
                  radius={4}
                  pathOptions={{ color: '#0a0f0d', fillColor: '#ffffff', fillOpacity: 0.9, weight: 1 }}
                >
                  <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>{c.nombre}</span>
                  </Tooltip>
                </CircleMarker>
              ))}

              {rastroVisible && posicionesConFix.length > 1 && (
                <Polyline
                  positions={posicionesConFix.map((p) => [parseFloat(p.lat), parseFloat(p.lng)])}
                  pathOptions={{ color: '#60a5fa', weight: 3, opacity: 0.85 }}
                />
              )}

              {rastroVisible && posicionesConFix.map((p) => {
                const esUltima = p.id === ultimaPosicionHoy?.id
                if (esUltima) return null
                return (
                  <CircleMarker
                    key={p.id}
                    center={[parseFloat(p.lat), parseFloat(p.lng)]}
                    radius={4}
                    pathOptions={{ color: '#0a0f0d', fillColor: '#60a5fa', fillOpacity: 0.9, weight: 1 }}
                  >
                    <Popup>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
                        {fechaHoraLocal(p.fecha_hora_spot)}<br />
                        Batería: {BATERIA_CONFIG[p.bateria]?.label ?? p.bateria}<br />
                        Tipo: {p.message_type}
                      </span>
                    </Popup>
                  </CircleMarker>
                )
              })}

              {rastroVisible && ultimaPosicionHoy && (
                <Marker
                  position={[parseFloat(ultimaPosicionHoy.lat), parseFloat(ultimaPosicionHoy.lng)]}
                  icon={iconoUltimaPosicion}
                >
                  <Popup>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
                      Última posición<br />
                      {fechaHoraLocal(ultimaPosicionHoy.fecha_hora_spot)}<br />
                      Batería: {BATERIA_CONFIG[ultimaPosicionHoy.bateria]?.label ?? ultimaPosicionHoy.bateria}<br />
                      Tipo: {ultimaPosicionHoy.message_type}
                    </span>
                  </Popup>
                </Marker>
              )}

              {rastroVisible && posicionesFuera.map((p) => (
                <Marker
                  key={`fuera-${p.id}`}
                  position={[parseFloat(p.lat), parseFloat(p.lng)]}
                  icon={iconoFueraPerimetro}
                >
                  <Popup>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
                      ⚠️ Fuera del perímetro<br />
                      {fechaHoraLocal(p.fecha_hora_spot)}
                    </span>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Historial */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-wide text-text-secondary">
                Historial — {asignacionSeleccionada ? asignacionSeleccionada.nombre : fecha}
              </p>
              <button
                type="button"
                onClick={() => descargarCSV(posiciones)}
                disabled={posiciones.length === 0}
                className="rounded-lg border-2 border-highlight px-3 py-1.5 text-xs font-bold text-highlight transition hover:bg-accent disabled:opacity-50"
              >
                📤 Exportar CSV
              </button>
            </div>

            {cargando ? (
              <p className="text-sm text-text-secondary">Cargando...</p>
            ) : posiciones.length === 0 ? (
              <p className="text-sm text-text-secondary">Sin posiciones registradas para esta fecha.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-card text-xs uppercase text-text-secondary">
                    <tr>
                      <th className="py-2 pr-2">Hora</th>
                      <th className="py-2 pr-2">Lat</th>
                      <th className="py-2 pr-2">Lng</th>
                      <th className="py-2 pr-2">Batería</th>
                      <th className="py-2 pr-2">Tipo</th>
                      <th className="py-2">Perímetro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posiciones.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="py-1.5 pr-2 font-mono text-text">{horaLocal(p.fecha_hora_spot)}</td>
                        <td className="py-1.5 pr-2 font-mono text-text-secondary">{Number(p.lat).toFixed(5)}</td>
                        <td className="py-1.5 pr-2 font-mono text-text-secondary">{Number(p.lng).toFixed(5)}</td>
                        <td className="py-1.5 pr-2 text-text">
                          {BATERIA_CONFIG[p.bateria]?.icon} {BATERIA_CONFIG[p.bateria]?.label ?? p.bateria}
                        </td>
                        <td className="py-1.5 pr-2 text-text-secondary">{p.message_type}</td>
                        <td className="py-1.5">
                          {p.dentro_perimetro ? (
                            <span className="text-highlight">✅ Dentro</span>
                          ) : (
                            <span className="font-bold text-error">⚠️ Fuera</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
