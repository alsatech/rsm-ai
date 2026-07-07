import 'leaflet/dist/leaflet.css'

import { useEffect, useRef, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'

import BotonToggleCercas from '../../../components/mapa/BotonToggleCercas'
import CapaCercas from '../../../components/mapa/CapaCercas'
import { useCercasVisibles } from '../../../hooks/useCercasVisibles'
import { COLOR_MAP } from './colorConfig'

const CENTER = [29.515, -101.545]
const ZOOM = 11

function MapClickCoords() {
  const [punto, setPunto] = useState(null)
  useMapEvents({ click: (e) => setPunto(e.latlng) })
  if (!punto) return null
  return (
    <Popup position={punto} onClose={() => setPunto(null)}>
      <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.8' }}>
        <div><strong>Lat:</strong> {punto.lat.toFixed(7)}</div>
        <div><strong>Lng:</strong> {punto.lng.toFixed(7)}</div>
      </div>
    </Popup>
  )
}

function MapController({ mapRef, marcador }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  if (!marcador) return null
  return (
    <CircleMarker
      center={marcador}
      radius={10}
      pathOptions={{ color: '#fff', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }}
    >
      <Tooltip direction="top" permanent opacity={0.95}>
        <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
          {marcador[0].toFixed(6)}, {marcador[1].toFixed(6)}
        </span>
      </Tooltip>
    </CircleMarker>
  )
}

/**
 * paradas: [{orden, tipo:'corraleta'|'libre', corraleta_id?, lat?, lng?, nombre}]
 */
export default function MapaRecorrido({
  corraletas = [],
  paradas = [],
  color = 'azul_claro',
  onSelectCorraleta,
  readOnly = false,
  height = '280px',
}) {
  const lineColor = COLOR_MAP[color] ?? '#60a5fa'
  const mapRef = useRef(null)
  const [query, setQuery] = useState('')
  const [marcador, setMarcador] = useState(null)
  const [error, setError] = useState('')
  const [cercasVisibles, toggleCercas] = useCercasVisibles()

  const selectedCorraletaIds = new Set(
    paradas.filter((p) => p.tipo === 'corraleta' && p.corraleta_id).map((p) => p.corraleta_id),
  )

  const polylinePoints = paradas
    .filter((p) => p.lat && p.lng)
    .map((p) => [parseFloat(p.lat), parseFloat(p.lng)])

  const handleBuscar = (e) => {
    e.preventDefault()
    setError('')
    const partes = query.trim().replace(/\s*,\s*/, ',').split(',')
    const lat = parseFloat(partes[0])
    const lng = parseFloat(partes[1])
    if (isNaN(lat) || isNaN(lng)) {
      setError('Formato: lat, lng')
      return
    }
    setMarcador([lat, lng])
    mapRef.current?.flyTo([lat, lng], 15, { duration: 1.2 })
  }

  return (
    <div>
      <div style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
        <BotonToggleCercas visible={cercasVisibles} onToggle={toggleCercas} />
        <MapContainer
          center={CENTER}
          zoom={ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />

          {cercasVisibles && <CapaCercas />}

          {corraletas.map((c) => {
            const isSelected = selectedCorraletaIds.has(c.id)
            const parada = paradas.find((p) => p.corraleta_id === c.id)
            const orden = parada?.orden
            return (
              <CircleMarker
                key={c.id}
                center={[parseFloat(c.lat), parseFloat(c.lng)]}
                radius={isSelected ? 10 : 7}
                pathOptions={{
                  color: isSelected ? lineColor : '#1f6b3e',
                  fillColor: isSelected ? lineColor : '#0d1a11',
                  fillOpacity: isSelected ? 0.9 : 0.7,
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={
                  !readOnly && onSelectCorraleta ? { click: () => onSelectCorraleta(c) } : {}
                }
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
                    {isSelected && <strong style={{ color: lineColor }}>{orden}. </strong>}
                    {c.nombre}
                  </span>
                </Tooltip>
              </CircleMarker>
            )
          })}

          {paradas
            .filter((p) => p.tipo === 'libre' && p.lat && p.lng)
            .map((p) => (
              <CircleMarker
                key={`libre-${p.orden}`}
                center={[parseFloat(p.lat), parseFloat(p.lng)]}
                radius={9}
                pathOptions={{
                  color: lineColor,
                  fillColor: lineColor,
                  fillOpacity: 0.65,
                  weight: 2,
                  dashArray: '5 4',
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
                    <strong style={{ color: lineColor }}>{p.orden}. </strong>
                    {p.nombre}
                  </span>
                </Tooltip>
              </CircleMarker>
            ))}

          {polylinePoints.length >= 2 && (
            <Polyline
              positions={polylinePoints}
              pathOptions={{ color: lineColor, weight: 3, opacity: 0.85 }}
            />
          )}

          <MapClickCoords />
          <MapController mapRef={mapRef} marcador={marcador} />
        </MapContainer>
      </div>

      {/* Buscador de coordenadas */}
      <form onSubmit={handleBuscar} className="mt-2 flex items-center gap-2">
        <span className="text-lg">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setError('') }}
          placeholder="Buscar coords: 29.515, -101.545"
          className="flex-1 rounded-xl border-2 border-border bg-card px-3 py-2.5 font-mono text-sm text-text placeholder-text-secondary/70 focus:border-highlight focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl border-2 border-border bg-card px-4 py-2.5 text-sm font-bold text-text-secondary hover:border-highlight hover:text-highlight transition"
        >
          Ir
        </button>
        {marcador && (
          <button
            type="button"
            onClick={() => { setMarcador(null); setQuery('') }}
            className="rounded-xl border-2 border-border bg-card px-3 py-2.5 text-sm font-bold text-error hover:border-error transition"
          >
            ✕
          </button>
        )}
      </form>
      {error && <p className="mt-1 px-1 text-sm font-semibold text-error">{error}</p>}
    </div>
  )
}
