import 'leaflet/dist/leaflet.css'

import html2canvas from 'html2canvas'
import L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'

import { getCorraletas, getHeatmap, getRecorridos } from '../../api/ganado'
import { useToast } from '../../hooks/useToast'

// leaflet.heat espera un global `L` (build sin módulos) — hay que exponerlo
// antes de importarlo dinámicamente, si no, revienta con "L is not defined".
if (typeof window !== 'undefined' && !window.L) {
  window.L = L
}
const leafletHeatReady = import('leaflet.heat')

const CENTER = [29.515, -101.545]
const ZOOM = 12

const FILTROS = [
  { id: 'mes', label: 'Último mes', dias: 30 },
  { id: 'trimestre', label: 'Últimos 3 meses', dias: 90 },
  { id: 'todo', label: 'Todo el historial', dias: null },
]

function fechaDesde(dias) {
  if (!dias) return null
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().split('T')[0]
}

function HeatLayer({ puntos }) {
  const map = useMap()
  const layerRef = useRef(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    leafletHeatReady.then(() => setListo(true))
  }, [])

  useEffect(() => {
    if (!listo) return
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }
    if (!puntos.length) return
    // Normalizar cada peso contra el máximo del dataset actual: así una zona
    // con 1 visita y otra con 12 se distinguen claramente, sin importar la
    // escala absoluta de visitas del periodo filtrado.
    const maxWeight = Math.max(...puntos.map((p) => p.weight))
    const data = puntos.map((p) => [p.lat, p.lng, p.weight / maxWeight])
    layerRef.current = L.heatLayer(data, {
      radius: 35,
      blur: 25,
      maxZoom: 12,
      max: 1.0,
      gradient: { 0.0: 'blue', 0.3: 'cyan', 0.5: 'lime', 0.7: 'yellow', 0.85: 'orange', 1.0: 'red' },
    }).addTo(map)
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current)
    }
  }, [map, puntos, listo])

  return null
}

export default function HeatmapPastoreo({ onVolver }) {
  const { showToast } = useToast()
  const [filtro, setFiltro] = useState('trimestre')
  const [puntos, setPuntos] = useState([])
  const [corraletas, setCorraletas] = useState([])
  const [totalRecorridos, setTotalRecorridos] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)
  const mapWrapperRef = useRef(null)

  useEffect(() => {
    getCorraletas().then(({ data }) => setCorraletas(data)).catch(() => {})
  }, [])

  useEffect(() => {
    const dias = FILTROS.find((f) => f.id === filtro)?.dias
    const desde = fechaDesde(dias)
    const params = desde ? { fecha_desde: desde } : {}

    setLoading(true)
    Promise.all([getHeatmap(params), getRecorridos(params)])
      .then(([{ data: heat }, { data: recorridos }]) => {
        setPuntos(heat)
        setTotalRecorridos(recorridos.filter((r) => r.estado === 'finalizado').length)
      })
      .catch(() => showToast('No se pudo cargar el mapa de pastoreo.', 'error'))
      .finally(() => setLoading(false))
  }, [filtro, showToast])

  const totalParadas = puntos.reduce((sum, p) => sum + p.weight, 0)
  const maxWeight = puntos.length ? Math.max(...puntos.map((p) => p.weight)) : 0
  const puntosOrdenados = [...puntos].sort((a, b) => b.weight - a.weight)
  const umbralAlto = Math.max(1, Math.ceil(maxWeight * 0.7))
  const umbralBajo = Math.max(1, Math.ceil(maxWeight * 0.3))

  const handleExportar = async () => {
    if (!mapWrapperRef.current) return
    setExportando(true)
    try {
      const canvas = await html2canvas(mapWrapperRef.current, { useCORS: true })
      const link = document.createElement('a')
      link.download = `mapa-pastoreo-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      showToast('No se pudo exportar la imagen.', 'error')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="min-h-svh bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="font-bold text-highlight">🌡️ Mapa de presión de pastoreo</h1>
            <p className="text-xs text-text-secondary">Zonas más y menos visitadas por el hato</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row">
        {/* Mapa */}
        <div ref={mapWrapperRef} className="flex-1 overflow-hidden rounded-2xl" style={{ height: '70svh' }}>
          <MapContainer center={CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='Tiles &copy; <a href="https://www.esri.com">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <HeatLayer puntos={puntos} />
            {corraletas.map((c) => (
              <CircleMarker
                key={c.id}
                center={[parseFloat(c.lat), parseFloat(c.lng)]}
                radius={5}
                pathOptions={{ color: '#0a0f0d', fillColor: '#ffffff', fillOpacity: 0.95, weight: 1.5 }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>{c.nombre}</span>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Panel lateral */}
        <aside className="w-full shrink-0 space-y-4 lg:w-72">
          {/* Filtros */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-text-secondary">Periodo</p>
            <div className="space-y-2">
              {FILTROS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltro(f.id)}
                  className={`w-full rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition ${
                    filtro === f.id
                      ? 'border-highlight bg-accent text-highlight'
                      : 'border-border text-text-secondary hover:border-accent'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Leyenda */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-text-secondary">Leyenda</p>
            <div className="h-3 w-full rounded-full" style={{
              background: 'linear-gradient(to right, blue, cyan, lime, yellow, orange, red)',
            }} />
            {maxWeight > 0 && (
              <div className="mt-2 space-y-1 text-xs text-text-secondary">
                <p>🔴 Más de {umbralAlto} visitas</p>
                <p>🟡 Entre {umbralBajo} y {umbralAlto} visitas</p>
                <p>🔵 1 a {umbralBajo} visitas</p>
              </div>
            )}
          </div>

          {/* Tabla de referencia */}
          {puntosOrdenados.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-text-secondary">Visitas por punto</p>
              <div className="max-h-64 space-y-1 overflow-y-auto text-sm">
                {puntosOrdenados.map((p, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border py-1 last:border-0">
                    <span className="truncate text-text">{p.nombre}</span>
                    <span className="ml-2 shrink-0 font-mono text-text-secondary">{p.weight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contador */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-text-secondary">
              {loading
                ? 'Cargando...'
                : `Basado en ${totalRecorridos} recorrido${totalRecorridos !== 1 ? 's' : ''}, ${totalParadas} parada${totalParadas !== 1 ? 's' : ''} totales`}
            </p>
          </div>

          {/* Exportar */}
          <button
            type="button"
            onClick={handleExportar}
            disabled={exportando}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-highlight py-3 text-sm font-bold text-highlight transition hover:bg-accent disabled:opacity-50"
          >
            {exportando ? 'Exportando...' : '📤 Exportar imagen'}
          </button>
        </aside>
      </div>
    </div>
  )
}
