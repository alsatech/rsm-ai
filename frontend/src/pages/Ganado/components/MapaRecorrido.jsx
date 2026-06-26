import 'leaflet/dist/leaflet.css'

import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet'

import { COLOR_MAP } from './colorConfig'

const CENTER = [29.515, -101.545]
const ZOOM = 11

export default function MapaRecorrido({
  corraletas = [],
  paradasSeleccionadas = [],
  color = 'azul_claro',
  onSelectCorraleta,
  readOnly = false,
  height = '280px',
}) {
  const selectedIds = new Set(paradasSeleccionadas.map((p) => p.id))
  const lineColor = COLOR_MAP[color] ?? '#60a5fa'

  const polylinePoints = paradasSeleccionadas.map((p) => [
    parseFloat(p.lat),
    parseFloat(p.lng),
  ])

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
          const isSelected = selectedIds.has(c.id)
          const orden = paradasSeleccionadas.findIndex((p) => p.id === c.id) + 1

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
                !readOnly && onSelectCorraleta
                  ? {
                      click: () => onSelectCorraleta(c),
                    }
                  : {}
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
