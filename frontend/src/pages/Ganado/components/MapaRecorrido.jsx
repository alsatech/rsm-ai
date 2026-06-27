import 'leaflet/dist/leaflet.css'

import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet'

import { COLOR_MAP } from './colorConfig'

const CENTER = [29.515, -101.545]
const ZOOM = 11

/**
 * paradas: [{orden, tipo:'corraleta'|'libre', corraleta_id?, lat?, lng?, nombre}]
 * computed by the parent from the API response
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

  const selectedCorraletaIds = new Set(
    paradas.filter((p) => p.tipo === 'corraleta' && p.corraleta_id).map((p) => p.corraleta_id),
  )

  const polylinePoints = paradas
    .filter((p) => p.lat && p.lng)
    .map((p) => [parseFloat(p.lat), parseFloat(p.lng)])

  return (
    <div style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        center={CENTER}
        zoom={ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

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
      </MapContainer>
    </div>
  )
}
