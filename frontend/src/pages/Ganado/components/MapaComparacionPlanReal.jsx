import 'leaflet/dist/leaflet.css'

import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet'

import BotonToggleCercas from '../../../components/mapa/BotonToggleCercas'
import CapaCercas from '../../../components/mapa/CapaCercas'
import { useCercasVisibles } from '../../../hooks/useCercasVisibles'

const CENTER = [29.515, -101.545]
const ZOOM = 12

const COLOR_PLANEADA = '#60a5fa'
const COLOR_REAL = '#fb923c'
const BORDE_NO_VISITADA = '#f87171'
const BORDE_EXTRA = '#4ade80'

function paradaCoords(p) {
  const lat = p.corraleta_detalle?.lat ?? p.lat
  const lng = p.corraleta_detalle?.lng ?? p.lng
  if (lat == null || lng == null) return null
  return [parseFloat(lat), parseFloat(lng)]
}

function ordenarPorOrden(paradas) {
  return [...paradas].sort((a, b) => a.orden - b.orden)
}

/**
 * Combina paradas planeadas y reales en un solo set de marcadores:
 * - planeada visitada: relleno naranja, sin borde extra
 * - planeada NO visitada: relleno azul, borde rojo
 * - visitada NO planeada (extra): relleno naranja, borde verde
 */
function construirMarcadores(plan, real) {
  const paradasPlan = plan ? ordenarPorOrden(plan.paradas) : []
  const paradasReal = real ? ordenarPorOrden(real.paradas) : []
  const idsPlaneados = new Set(paradasPlan.filter((p) => p.corraleta).map((p) => p.corraleta))
  const idsVisitados = new Set(paradasReal.filter((p) => p.corraleta).map((p) => p.corraleta))

  const marcadores = []

  paradasPlan.forEach((p) => {
    const coords = paradaCoords(p)
    if (!coords) return
    const visitada = p.corraleta && idsVisitados.has(p.corraleta)
    marcadores.push({
      key: `plan-${p.id}`,
      coords,
      nombre: p.corraleta_detalle?.nombre ?? p.nombre_libre,
      fill: visitada ? COLOR_REAL : COLOR_PLANEADA,
      borde: visitada ? null : BORDE_NO_VISITADA,
      estado: visitada ? '✅ Visitada' : '❌ No visitada',
    })
  })

  paradasReal.forEach((p) => {
    const enPlan = p.corraleta && idsPlaneados.has(p.corraleta)
    if (enPlan) return
    const coords = paradaCoords(p)
    if (!coords) return
    marcadores.push({
      key: `real-${p.id}`,
      coords,
      nombre: p.corraleta_detalle?.nombre ?? p.nombre_libre ?? 'Punto libre',
      fill: COLOR_REAL,
      borde: BORDE_EXTRA,
      estado: '➕ Extra (no planeada)',
    })
  })

  return marcadores
}

export default function MapaComparacionPlanReal({ plan, real, height = '60svh' }) {
  const paradasPlan = plan ? ordenarPorOrden(plan.paradas) : []
  const paradasReal = real ? ordenarPorOrden(real.paradas) : []
  const lineaPlan = paradasPlan.map(paradaCoords).filter(Boolean)
  const lineaReal = paradasReal.map(paradaCoords).filter(Boolean)
  const marcadores = construirMarcadores(plan, real)
  const [cercasVisibles, toggleCercas] = useCercasVisibles()

  return (
    <div style={{ height, width: '100%', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
      <BotonToggleCercas visible={cercasVisibles} onToggle={toggleCercas} />
      <MapContainer center={CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='Tiles &copy; <a href="https://www.esri.com">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        {cercasVisibles && <CapaCercas />}

        {lineaPlan.length >= 2 && (
          <Polyline
            positions={lineaPlan}
            pathOptions={{ color: COLOR_PLANEADA, weight: 5, opacity: 0.8, dashArray: '10 8' }}
          />
        )}
        {lineaReal.length >= 2 && (
          <Polyline
            positions={lineaReal}
            pathOptions={{ color: COLOR_REAL, weight: 4, opacity: 0.9 }}
          />
        )}

        {marcadores.map((m) => (
          <CircleMarker
            key={m.key}
            center={m.coords}
            radius={9}
            pathOptions={{
              color: m.borde ?? '#0a0f0d',
              fillColor: m.fill,
              fillOpacity: 0.9,
              weight: m.borde ? 3 : 1.5,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
                {m.nombre}
                <br />
                {m.estado}
              </span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
