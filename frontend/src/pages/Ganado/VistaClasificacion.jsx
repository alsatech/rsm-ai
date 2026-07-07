import 'leaflet/dist/leaflet.css'

import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'

import { getClasificacionCorraletas } from '../../api/ganado'
import BotonToggleCercas from '../../components/mapa/BotonToggleCercas'
import CapaCercas from '../../components/mapa/CapaCercas'
import { useCercasVisibles } from '../../hooks/useCercasVisibles'
import { useToast } from '../../hooks/useToast'
import { CLASE_CONFIG } from './components/colorConfig'

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

function descargarCSV(corraletas) {
  const filas = [['nombre', 'visitas', 'clase'], ...corraletas.map((c) => [c.nombre, c.visitas, c.clase])]
  const csv = filas.map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `clasificacion-pastoreo-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

export default function VistaClasificacion() {
  const { showToast } = useToast()
  const [filtro, setFiltro] = useState('trimestre')
  const [corraletas, setCorraletas] = useState([])
  const [loading, setLoading] = useState(true)
  const [cercasVisibles, toggleCercas] = useCercasVisibles()

  useEffect(() => {
    const dias = FILTROS.find((f) => f.id === filtro)?.dias
    const desde = fechaDesde(dias)
    const params = desde ? { fecha_desde: desde } : {}

    setLoading(true)
    getClasificacionCorraletas(params)
      .then(({ data }) => setCorraletas(data))
      .catch(() => showToast('No se pudo cargar la clasificación de corraletas.', 'error'))
      .finally(() => setLoading(false))
  }, [filtro, showToast])

  const porClase = (clase) => corraletas.filter((c) => c.clase === clase)
  const visitasNoCero = corraletas.filter((c) => c.visitas > 0).map((c) => c.visitas)
  const rangoTexto = (clase) => {
    const grupo = porClase(clase)
    if (!grupo.length) return null
    const min = Math.min(...grupo.map((c) => c.visitas))
    const max = Math.max(...grupo.map((c) => c.visitas))
    if (clase === 'alta') return `${min} visitas o más`
    if (clase === 'baja') return `${min} a ${max} visitas`
    if (clase === 'media') return `${min} a ${max} visitas`
    return null
  }

  const ordenadas = [...corraletas].sort((a, b) => b.visitas - a.visitas)

  return (
    <div className="min-h-svh bg-bg">
      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row">
        {/* Mapa */}
        <div className="relative flex-1 overflow-hidden rounded-2xl" style={{ height: '70svh' }}>
          <BotonToggleCercas visible={cercasVisibles} onToggle={toggleCercas} />
          <MapContainer center={CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='Tiles &copy; <a href="https://www.esri.com">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            {cercasVisibles && <CapaCercas />}
            {corraletas.map((c) => (
              <CircleMarker
                key={c.id}
                center={[parseFloat(c.lat), parseFloat(c.lng)]}
                radius={8}
                pathOptions={{
                  color: '#0a0f0d',
                  fillColor: CLASE_CONFIG[c.clase].color,
                  fillOpacity: 0.9,
                  weight: 1.5,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
                    {CLASE_CONFIG[c.clase].icon} {c.nombre} — {c.visitas} visita{c.visitas !== 1 ? 's' : ''}
                    <br />
                    {CLASE_CONFIG[c.clase].label}
                  </span>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Panel lateral */}
        <aside className="w-full shrink-0 space-y-4 lg:w-80">
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
            {loading && <p className="text-sm text-text-secondary">Cargando...</p>}
            {!loading && visitasNoCero.length === 0 && (
              <p className="text-sm text-text-secondary">Sin visitas registradas en este periodo.</p>
            )}
            {!loading && (
              <div className="space-y-1.5 text-sm text-text-secondary">
                {['alta', 'media', 'baja', 'sin_uso'].map((clase) => {
                  const rango = clase === 'sin_uso' ? '0 visitas' : rangoTexto(clase)
                  if (!rango) return null
                  return (
                    <p key={clase}>
                      {CLASE_CONFIG[clase].icon} {CLASE_CONFIG[clase].label}: {rango}
                    </p>
                  )
                })}
              </div>
            )}
          </div>

          {/* Lista de corraletas */}
          {ordenadas.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-text-secondary">
                Corraletas ({ordenadas.length})
              </p>
              <div className="max-h-72 space-y-1 overflow-y-auto text-sm">
                {ordenadas.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
                    <span className="flex items-center gap-2 truncate text-text">
                      <span>{CLASE_CONFIG[c.clase].icon}</span>
                      <span className="truncate">{c.nombre}</span>
                    </span>
                    <span className="ml-2 shrink-0 font-mono text-text-secondary">{c.visitas}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exportar */}
          <button
            type="button"
            onClick={() => descargarCSV(ordenadas)}
            disabled={loading || ordenadas.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-highlight py-3 text-sm font-bold text-highlight transition hover:bg-accent disabled:opacity-50"
          >
            📤 Exportar CSV
          </button>
        </aside>
      </div>
    </div>
  )
}
