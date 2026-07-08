import 'leaflet/dist/leaflet.css'

import { useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, Tooltip } from 'react-leaflet'

import { CERCAS_RANCHO } from '../../../constants/cercasRancho'
import { puntoDentroDePoligono } from '../../../utils/geo'

const CENTER = [29.515, -101.545]
const ZOOM = 11

const CERCAS_POLIGONO = CERCAS_RANCHO.filter((c) => c.tipo === 'Polygon')
const CERCAS_LINEA = CERCAS_RANCHO.filter((c) => c.tipo === 'LineString')

/**
 * Pantalla grande de selección de zona: el usuario toca una de las cercas
 * cerradas (polígono) del rancho y se le muestran las corraletas que caen
 * dentro de ese perímetro, listas para agregar al plan del día.
 */
export default function SelectorZonaCercas({ corraletas = [], onConfirmar, onCerrar }) {
  const [cercaActiva, setCercaActiva] = useState(null)

  const corraletasDentro = useMemo(() => {
    if (!cercaActiva) return []
    return corraletas.filter((c) =>
      puntoDentroDePoligono(parseFloat(c.lat), parseFloat(c.lng), cercaActiva.coordenadas),
    )
  }, [cercaActiva, corraletas])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <p className="text-lg font-bold text-gray-900">Elegir zona por cerca</p>
          <p className="text-sm text-gray-500">
            Toca una cerca cerrada (naranja) para ver qué corraletas caen dentro
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-lg text-gray-500 hover:border-gray-500 hover:text-gray-800"
        >
          ✕
        </button>
      </div>

      {/* Mapa — ocupa la mayor parte de la pantalla */}
      <div className="flex-1" style={{ minHeight: '65svh' }}>
        <MapContainer center={CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='Tiles &copy; <a href="https://www.esri.com">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />

          {/* Cercas de referencia (líneas, no seleccionables) */}
          {CERCAS_LINEA.map((cerca) => (
            <Polyline
              key={cerca.nombre}
              positions={cerca.coordenadas}
              pathOptions={{ color: '#FFA500', weight: 2, opacity: 0.5 }}
            />
          ))}

          {/* Cercas cerradas — seleccionables */}
          {CERCAS_POLIGONO.map((cerca) => {
            const activa = cercaActiva?.nombre === cerca.nombre
            return (
              <Polygon
                key={cerca.nombre}
                positions={cerca.coordenadas}
                pathOptions={{
                  color: '#FFA500',
                  weight: activa ? 4 : 2,
                  opacity: 0.9,
                  fillColor: '#FFA500',
                  fillOpacity: activa ? 0.25 : 0.08,
                }}
                eventHandlers={{ click: () => setCercaActiva(cerca) }}
              >
                <Tooltip sticky opacity={0.95} className="tooltip-cerca">
                  {cerca.nombre}
                </Tooltip>
              </Polygon>
            )
          })}

          {/* Corraletas: resaltadas si caen dentro de la cerca activa */}
          {corraletas.map((c) => {
            const dentro = corraletasDentro.some((d) => d.id === c.id)
            return (
              <CircleMarker
                key={c.id}
                center={[parseFloat(c.lat), parseFloat(c.lng)]}
                radius={dentro ? 10 : 6}
                pathOptions={{
                  color: '#0a0f0d',
                  fillColor: dentro ? '#4ade80' : '#9ca3af',
                  fillOpacity: dentro ? 0.95 : 0.5,
                  weight: 1.5,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>{c.nombre}</span>
                </Tooltip>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {/* Panel inferior — claro, texto e inputs fáciles de leer */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        {!cercaActiva && (
          <p className="text-center text-sm text-gray-500">
            Ninguna cerca seleccionada todavía.
          </p>
        )}

        {cercaActiva && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-gray-900">
                {cercaActiva.nombre} — {corraletasDentro.length} corraleta{corraletasDentro.length !== 1 ? 's' : ''} dentro
              </p>
              <button
                type="button"
                onClick={() => setCercaActiva(null)}
                className="text-sm font-semibold text-gray-500 hover:text-gray-800"
              >
                Quitar selección
              </button>
            </div>

            {corraletasDentro.length > 0 ? (
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
                {corraletasDentro.map((c, i) => (
                  <p key={c.id} className="text-gray-800">
                    <span className="font-mono font-bold text-[#1f6b3e]">{i + 1}.</span> {c.nombre}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay corraletas dentro de esta cerca.</p>
            )}

            <button
              type="button"
              onClick={() => onConfirmar(corraletasDentro)}
              disabled={corraletasDentro.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1f6b3e] py-4 text-base font-bold text-white transition hover:opacity-90 disabled:opacity-40"
            >
              Usar estas {corraletasDentro.length} corraleta{corraletasDentro.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
