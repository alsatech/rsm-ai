import 'leaflet/dist/leaflet.css'

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'

import { finalizarRecorrido, getRecorrido, iniciarRecorrido, syncParadas } from '../../api/ganado'
import BotonToggleCercas from '../../components/mapa/BotonToggleCercas'
import CapaCercas from '../../components/mapa/CapaCercas'
import { useCercasVisibles } from '../../hooks/useCercasVisibles'
import { useToast } from '../../hooks/useToast'

// ⚠️ Puntos de PRUEBA en El Paso, TX — NO son las corraletas reales del rancho.
// Este componente es temporal y sirve solo para testear el flujo offline.
const PUNTOS_PRUEBA = [
  { id: 'P1', nombre: 'Main Office', lat: 31.820818881556207, lng: -106.54674381262168 },
  { id: 'P2', nombre: 'Tennis Court', lat: 31.820895979706826, lng: -106.54607700058766 },
  { id: 'P3', nombre: 'Basurero', lat: 31.821647088261187, lng: -106.54716939384122 },
]

const SIM_KEY = 'rsm_simulacion_activa'
const COLOR_LINEA = '#4ade80'

function getSimLocal() {
  const data = localStorage.getItem(SIM_KEY)
  return data ? JSON.parse(data) : null
}

function guardarSimLocal(sim) {
  localStorage.setItem(SIM_KEY, JSON.stringify(sim))
}

function limpiarSimLocal() {
  localStorage.removeItem(SIM_KEY)
}

function formatHora(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// Convierte el error del backend (incluyendo errores anidados por parada de
// SyncParadasSerializer) en un mensaje legible en vez de un texto genérico.
function extraerMensajeError(data) {
  if (!data) return 'No se pudo sincronizar el recorrido simulado.'
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  if (Array.isArray(data.paradas)) {
    for (let i = 0; i < data.paradas.length; i += 1) {
      const item = data.paradas[i]
      if (item && typeof item === 'object' && Object.keys(item).length) {
        const campo = Object.keys(item)[0]
        const val = item[campo]
        const detalle = Array.isArray(val) ? val[0] : val
        return `Parada ${i + 1} (${campo}): ${detalle}`
      }
    }
  }
  const campo = Object.keys(data)[0]
  const val = campo ? data[campo] : null
  if (Array.isArray(val)) return `${campo}: ${val[0]}`
  if (typeof val === 'string') return `${campo}: ${val}`
  return 'No se pudo sincronizar el recorrido simulado.'
}

// Ajusta el encuadre del mapa para que quepan todos los puntos + paradas.
function AjustarEncuadre({ puntos }) {
  const map = useMap()
  useEffect(() => {
    if (!puntos.length) return
    if (puntos.length === 1) {
      map.setView(puntos[0], 18)
      return
    }
    map.fitBounds(puntos, { padding: [50, 50], maxZoom: 18 })
  }, [map, puntos])
  return null
}

export default function SimulacionRecorrido() {
  const { showToast } = useToast()
  const [fase, setFase] = useState(() => (getSimLocal() ? 'en_curso' : 'inicio'))
  const [sim, setSim] = useState(() => getSimLocal())
  const [enLineaReal, setEnLineaReal] = useState(navigator.onLine)
  const [simuladoOffline, setSimuladoOffline] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [resumen, setResumen] = useState(null)
  const [mostrarConfirmCancelar, setMostrarConfirmCancelar] = useState(false)
  const [cercasVisibles, toggleCercas] = useCercasVisibles()

  // Punto libre manual
  const [nombreLibre, setNombreLibre] = useState('')
  const [latLibre, setLatLibre] = useState('')
  const [lngLibre, setLngLibre] = useState('')

  useEffect(() => {
    const onOnline = () => setEnLineaReal(true)
    const onOffline = () => setEnLineaReal(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Al abrir la pantalla: si quedó un recorrido pendiente de sync cuyo backend
  // ya lo marcó como finalizado (p.ej. el finalizar sí llegó pero la respuesta
  // se perdió), se limpia el local sin preguntar — ya no hay nada que sincronizar.
  useEffect(() => {
    const actual = getSimLocal()
    if (!actual?.recorridoId) return
    let cancelado = false
    getRecorrido(actual.recorridoId)
      .then(({ data }) => {
        if (cancelado || data.estado !== 'finalizado') return
        limpiarSimLocal()
        setSim(null)
        setFase('inicio')
        showToast('El recorrido pendiente ya estaba sincronizado en el servidor.', 'alerta')
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [showToast])

  // El indicador muestra "sin señal" si de verdad no hay o si estamos simulando.
  const mostrandoOffline = simuladoOffline || !enLineaReal

  const paradas = useMemo(() => sim?.paradas ?? [], [sim])

  const puntosMapa = useMemo(() => {
    const base = PUNTOS_PRUEBA.map((p) => [p.lat, p.lng])
    const deParadas = paradas
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => [parseFloat(p.lat), parseFloat(p.lng)])
    return [...base, ...deParadas]
  }, [paradas])

  const rutaPolyline = paradas
    .filter((p) => p.lat != null && p.lng != null)
    .sort((a, b) => a.orden - b.orden)
    .map((p) => [parseFloat(p.lat), parseFloat(p.lng)])

  const handleIniciar = () => {
    const nuevo = {
      fecha: new Date().toISOString().slice(0, 10),
      color: 'naranja',
      iniciado_en: new Date().toISOString(),
      paradas: [],
      recorridoId: null,
    }
    guardarSimLocal(nuevo)
    setSim(nuevo)
    setFase('en_curso')
    showToast('🐄 Recorrido simulado iniciado', 'exito')
  }

  const agregarParada = ({ nombre, lat, lng }) => {
    const actual = getSimLocal()
    if (!actual) return
    const nueva = {
      orden: (actual.paradas?.length ?? 0) + 1,
      corraleta_id: null,
      nombre_libre: nombre,
      nombre,
      // El backend acepta máximo 12 decimales (DecimalField max_digits=18, decimal_places=12).
      lat: lat != null ? Number(lat).toFixed(12) : null,
      lng: lng != null ? Number(lng).toFixed(12) : null,
      timestamp: new Date().toISOString(),
    }
    const actualizado = { ...actual, paradas: [...(actual.paradas ?? []), nueva] }
    guardarSimLocal(actualizado)
    setSim(actualizado)
    return nueva
  }

  const handleTapPunto = (p) => {
    agregarParada({ nombre: p.nombre, lat: p.lat, lng: p.lng })
    showToast(`✅ Llegué a ${p.nombre}`, 'exito')
  }

  const handleAgregarLibre = () => {
    if (!nombreLibre.trim()) {
      showToast('Escribe el nombre del punto libre.', 'error')
      return
    }
    agregarParada({
      nombre: nombreLibre.trim(),
      lat: latLibre !== '' ? latLibre : null,
      lng: lngLibre !== '' ? lngLibre : null,
    })
    setNombreLibre(''); setLatLibre(''); setLngLibre('')
    showToast('📌 Punto libre agregado', 'exito')
  }

  const handleDeshacer = () => {
    const actual = getSimLocal()
    if (!actual?.paradas?.length) return
    const actualizado = { ...actual, paradas: actual.paradas.slice(0, -1) }
    guardarSimLocal(actualizado)
    setSim(actualizado)
    showToast('Última parada eliminada', 'exito')
  }

  const handleFinalizar = async () => {
    if (!paradas.length) {
      showToast('Agrega al menos una parada antes de sincronizar.', 'error')
      return
    }
    setSincronizando(true)
    try {
      // 1) Crear el recorrido en el backend (mismo endpoint que el flujo real).
      // Si ya se creó en un intento anterior (retry tras un error), se reutiliza
      // el mismo id en vez de crear un recorrido duplicado.
      let id = sim.recorridoId
      if (!id) {
        const { data: creado } = await iniciarRecorrido({
          fecha: sim.fecha,
          color: sim.color,
          asistentes: [],
        })
        id = creado.id
        const conId = { ...getSimLocal(), recorridoId: id }
        guardarSimLocal(conId)
        setSim(conId)
      }

      // 2) Subir todas las paradas capturadas offline
      const paradasSync = paradas.map((p) => ({
        corraleta_id: null,
        nombre_libre: p.nombre_libre ?? p.nombre,
        lat: p.lat,
        lng: p.lng,
        orden: p.orden,
        timestamp: p.timestamp,
      }))
      await syncParadas(id, paradasSync)

      // 3) Cerrar el recorrido
      await finalizarRecorrido(id, {
        estado_hato: 'bien',
        narrativa: 'Recorrido generado desde el MODO SIMULACIÓN (puntos de prueba en El Paso, TX). Solo para pruebas del flujo offline.',
        observaciones: 'Registro de prueba — no corresponde a un recorrido real del rancho.',
        numero_cabezas: null,
        color: sim.color,
      })

      setResumen({
        id,
        fecha: sim.fecha,
        iniciado_en: sim.iniciado_en,
        finalizado_en: new Date().toISOString(),
        paradas: paradas.map((p) => ({ ...p })),
        simuladoOffline,
      })
      limpiarSimLocal()
      setSim(null)
      setFase('resumen')
      showToast('✅ Recorrido simulado sincronizado', 'exito')
    } catch (err) {
      // No se limpia el localStorage: el recorrido (y su id, si ya se creó)
      // se quedan guardados para que el usuario reintente sin perder nada.
      showToast(extraerMensajeError(err?.response?.data), 'error')
    } finally {
      setSincronizando(false)
    }
  }

  const handleReiniciar = () => {
    limpiarSimLocal()
    setSim(null)
    setResumen(null)
    setSimuladoOffline(false)
    setFase('inicio')
  }

  const handleCancelarRecorrido = () => {
    limpiarSimLocal()
    setSim(null)
    setMostrarConfirmCancelar(false)
    setFase('inicio')
    showToast('Recorrido cancelado.', 'alerta')
  }

  const puntosYaAgregados = new Set(paradas.map((p) => p.nombre_libre ?? p.nombre))

  return (
    <div className="min-h-svh bg-bg pb-40">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/ganado"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-lg text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-text">SIMULACIÓN</h1>
              <span className="rounded-full bg-[#f97316] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-black">
                🧪 Solo para pruebas
              </span>
            </div>
            <p className="text-xs text-text-secondary">Flujo offline con puntos de El Paso, TX</p>
          </div>
          {fase === 'en_curso' && (
            <button
              type="button"
              onClick={() => setMostrarConfirmCancelar(true)}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-text-secondary/70 transition hover:border-error/60 hover:text-error"
            >
              ✕ Cancelar recorrido
            </button>
          )}
        </div>
      </header>

      {/* Modal de confirmación para cancelar el recorrido en curso */}
      {mostrarConfirmCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
            <p className="text-base font-bold text-text">¿Cancelar el recorrido en curso?</p>
            <p className="mt-2 text-sm text-text-secondary">
              Se perderán las paradas no sincronizadas.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setMostrarConfirmCancelar(false)}
                className="flex-1 rounded-xl border-2 border-border py-3 text-sm font-bold text-text-secondary transition hover:border-accent"
              >
                Seguir aquí
              </button>
              <button
                type="button"
                onClick={handleCancelarRecorrido}
                className="flex-1 rounded-xl bg-error py-3 text-sm font-bold text-bg transition hover:opacity-90"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banda de advertencia */}
      <div className="border-b border-[#f97316]/40 bg-[#f97316]/10 px-4 py-2">
        <p className="text-xs font-semibold text-[#f97316]">
          ⚠️ Esta pantalla NO usa las corraletas reales del rancho. Los datos que sincronices se guardan
          como recorrido de prueba.
        </p>
      </div>

      {/* Indicador de conexión */}
      <div className="px-4 pt-4">
        <div
          className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 transition ${
            mostrandoOffline
              ? 'border-warning/60 bg-warning/10 opacity-60'
              : 'border-highlight/50 bg-highlight/10'
          }`}
        >
          <span className={`text-sm font-bold ${mostrandoOffline ? 'text-warning' : 'text-highlight'}`}>
            {mostrandoOffline ? '📵 Sin señal — guardando local' : '📶 Con señal'}
          </span>
          <button
            type="button"
            onClick={() => setSimuladoOffline((v) => !v)}
            className={`rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition ${
              simuladoOffline
                ? 'border-highlight bg-highlight text-bg'
                : 'border-border text-text-secondary hover:border-warning hover:text-warning'
            }`}
          >
            {simuladoOffline ? '📶 Reactivar señal' : '📵 Simular sin señal'}
          </button>
        </div>
        {simuladoOffline && (
          <p className="mt-1 px-1 text-[11px] text-text-secondary">
            (Solo simula cómo se ve la UI sin señal — tu internet real sigue conectado.)
          </p>
        )}
      </div>

      {/* Mapa (siempre visible salvo en el resumen) */}
      {fase !== 'resumen' && (
        <div className="px-4 pt-4">
          <div style={{ height: '38svh', width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            <BotonToggleCercas visible={cercasVisibles} onToggle={toggleCercas} />
            <MapContainer
              center={[PUNTOS_PRUEBA[0].lat, PUNTOS_PRUEBA[0].lng]}
              zoom={17}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />

              {cercasVisibles && <CapaCercas />}

              {/* Los 3 puntos de prueba */}
              {PUNTOS_PRUEBA.map((p) => {
                const visitado = puntosYaAgregados.has(p.nombre)
                return (
                  <CircleMarker
                    key={p.id}
                    center={[p.lat, p.lng]}
                    radius={visitado ? 10 : 7}
                    pathOptions={{
                      color: visitado ? COLOR_LINEA : '#f97316',
                      fillColor: visitado ? COLOR_LINEA : '#0d1a11',
                      fillOpacity: visitado ? 0.9 : 0.75,
                      weight: visitado ? 3 : 2,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
                        {visitado && <strong style={{ color: COLOR_LINEA }}>✓ </strong>}
                        {p.nombre}
                      </span>
                    </Tooltip>
                  </CircleMarker>
                )
              })}

              {/* Paradas libres (fuera del catálogo de prueba) */}
              {paradas
                .filter((p) => p.lat != null && p.lng != null && !PUNTOS_PRUEBA.some((tp) => tp.nombre === (p.nombre_libre ?? p.nombre)))
                .map((p) => (
                  <CircleMarker
                    key={`libre-${p.orden}`}
                    center={[parseFloat(p.lat), parseFloat(p.lng)]}
                    radius={9}
                    pathOptions={{
                      color: COLOR_LINEA,
                      fillColor: COLOR_LINEA,
                      fillOpacity: 0.65,
                      weight: 2,
                      dashArray: '5 4',
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
                        <strong style={{ color: COLOR_LINEA }}>{p.orden}. </strong>
                        {p.nombre}
                      </span>
                    </Tooltip>
                  </CircleMarker>
                ))}

              {rutaPolyline.length >= 2 && (
                <Polyline positions={rutaPolyline} pathOptions={{ color: COLOR_LINEA, weight: 3, opacity: 0.85 }} />
              )}

              <AjustarEncuadre puntos={puntosMapa} />
            </MapContainer>
          </div>
        </div>
      )}

      {/* FASE: inicio */}
      {fase === 'inicio' && (
        <div className="px-4 py-6">
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <p className="text-3xl">🧪</p>
            <p className="mt-2 text-lg font-bold text-text">Recorrido de prueba</p>
            <p className="mt-1 text-sm text-text-secondary">
              Simula el flujo completo: iniciar, marcar paradas offline y sincronizar al backend real.
            </p>
          </div>
          <button
            type="button"
            onClick={handleIniciar}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-highlight py-5 text-xl font-bold text-bg transition hover:opacity-90"
          >
            🐄 Iniciar recorrido simulado
          </button>
        </div>
      )}

      {/* FASE: en curso */}
      {fase === 'en_curso' && (
        <div className="px-4 py-4 space-y-5">
          {/* Botones grandes de puntos de prueba */}
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-text-secondary">
              📍 Marcar "llegué aquí"
            </p>
            <div className="grid grid-cols-1 gap-3">
              {PUNTOS_PRUEBA.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleTapPunto(p)}
                  className="flex items-center justify-between rounded-2xl border-2 border-border bg-card px-5 py-4 text-left transition hover:border-highlight active:scale-[0.98]"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">📌</span>
                    <span className="text-lg font-bold text-text">{p.nombre}</span>
                  </span>
                  <span className="font-mono text-xs text-text-secondary">
                    {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Punto libre */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-bold text-text-secondary">📝 Agregar punto libre</p>
            <input
              type="text"
              value={nombreLibre}
              onChange={(e) => setNombreLibre(e.target.value)}
              placeholder="Nombre del lugar"
              className="mb-2 w-full rounded-xl border-2 border-border bg-bg px-4 py-3 text-base text-text placeholder-text-secondary/60 focus:border-highlight focus:outline-none"
            />
            <div className="mb-3 flex gap-2">
              <input
                type="number"
                value={latLibre}
                onChange={(e) => setLatLibre(e.target.value)}
                placeholder="Latitud (opcional)"
                step="0.0000001"
                className="flex-1 rounded-xl border-2 border-border bg-bg px-3 py-3 text-sm text-text placeholder-text-secondary/60 focus:border-highlight focus:outline-none"
              />
              <input
                type="number"
                value={lngLibre}
                onChange={(e) => setLngLibre(e.target.value)}
                placeholder="Longitud (opcional)"
                step="0.0000001"
                className="flex-1 rounded-xl border-2 border-border bg-bg px-3 py-3 text-sm text-text placeholder-text-secondary/60 focus:border-highlight focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAgregarLibre}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-highlight py-3 text-base font-bold text-highlight transition hover:bg-accent"
            >
              📌 Agregar punto libre
            </button>
          </div>

          {/* Ruta actual */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-wide text-text-secondary">🗺️ Ruta actual</p>
              <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-highlight">
                {paradas.length} parada{paradas.length !== 1 ? 's' : ''}
              </span>
            </div>
            {paradas.length ? (
              <div className="space-y-2">
                {[...paradas].sort((a, b) => a.orden - b.orden).map((p) => (
                  <div key={p.orden} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-highlight text-sm font-bold text-bg">
                      {p.orden}
                    </span>
                    <span className="flex-1 text-base font-semibold text-text">{p.nombre}</span>
                    <span className="font-mono text-xs text-text-secondary">{formatHora(p.timestamp)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-3 text-center text-sm text-text-secondary">Sin paradas todavía.</p>
            )}
          </div>
        </div>
      )}

      {/* FASE: resumen */}
      {fase === 'resumen' && resumen && (
        <div className="px-4 py-6 space-y-5">
          <div className="rounded-2xl border-2 border-highlight bg-highlight/10 p-5 text-center">
            <p className="text-4xl">✅</p>
            <p className="mt-2 text-lg font-bold text-highlight">Sincronizado con el backend</p>
            <p className="mt-1 text-sm text-text-secondary">
              Recorrido de prueba #{resumen.id} guardado usando los endpoints reales
              /iniciar/, /sync-paradas/ y /finalizar/.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">ID recorrido</span>
              <span className="font-mono font-bold text-text">#{resumen.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Fecha</span>
              <span className="font-mono text-text">{resumen.fecha}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Iniciado</span>
              <span className="font-mono text-text">{formatHora(resumen.iniciado_en)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Sincronizado</span>
              <span className="font-mono text-text">{formatHora(resumen.finalizado_en)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Paradas sincronizadas</span>
              <span className="font-bold text-highlight">{resumen.paradas.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Capturado sin señal (simulado)</span>
              <span className="font-bold text-text">{resumen.simuladoOffline ? 'Sí' : 'No'}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-text-secondary">
              Paradas guardadas
            </p>
            <div className="space-y-2">
              {resumen.paradas.map((p) => (
                <div key={p.orden} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-highlight">
                    {p.orden}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-text">{p.nombre}</span>
                  <span className="font-mono text-xs text-text-secondary">{formatHora(p.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleReiniciar}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-highlight py-4 text-lg font-bold text-bg transition hover:opacity-90"
          >
            🔁 Correr otra simulación
          </button>
        </div>
      )}

      {/* Barra fija de acciones (solo en curso) */}
      {fase === 'en_curso' && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg px-4 py-4 space-y-3">
          <div className="flex gap-3">
            {paradas.length > 0 && (
              <button
                type="button"
                onClick={handleDeshacer}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-border py-4 text-base font-bold text-text-secondary transition hover:border-accent"
              >
                ↩ Deshacer
              </button>
            )}
            <button
              type="button"
              onClick={handleFinalizar}
              disabled={paradas.length === 0 || sincronizando}
              className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-highlight py-4 text-base font-bold text-bg transition hover:opacity-90 disabled:opacity-30"
            >
              {sincronizando
                ? <><span className="animate-spin text-xl">⏳</span> Sincronizando...</>
                : <>✅ Finalizar y sincronizar</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
