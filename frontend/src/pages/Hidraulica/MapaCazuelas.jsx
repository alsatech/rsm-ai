import 'leaflet/dist/leaflet.css'

import { divIcon } from 'leaflet'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'

import { getCazuelas } from '../../api/hidraulica'
import BotonToggleCercas from '../../components/mapa/BotonToggleCercas'
import CapaCercas from '../../components/mapa/CapaCercas'
import { useAuth } from '../../hooks/useAuth'
import { useCercasVisibles } from '../../hooks/useCercasVisibles'
import { NORIAS } from './constants'

const CENTER = [29.515, -101.545]
const ZOOM = 11

const ICONO_FALLA = divIcon({
  html: '<span style="font-size:16px;line-height:1;filter:drop-shadow(0 0 2px #0a0f0d)">⚠️</span>',
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 22],
})

export default function MapaCazuelas() {
  const { user } = useAuth()
  const puedeVerDetalleFallas = user?.rol === 'administrador' || user?.rol === 'superadmin'

  const [cazuelas, setCazuelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [noriasVisibles, setNoriasVisibles] = useState({ rosita: true, margaritas: true, chapote: true })
  const [cercasVisibles, toggleCercas] = useCercasVisibles()

  const cargarCazuelas = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getCazuelas()
      setCazuelas(data)
    } catch {
      setError('No se pudieron cargar las cazuelas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarCazuelas()
  }, [cargarCazuelas])

  const resumenPorNoria = useMemo(() => {
    const resumen = {}
    for (const noria of Object.keys(NORIAS)) {
      const delaNoria = cazuelas.filter((c) => c.noria === noria)
      resumen[noria] = {
        total: delaNoria.length,
        afectadas: delaNoria.filter((c) => !c.activa),
      }
    }
    return resumen
  }, [cazuelas])

  const noriasConFalla = Object.entries(resumenPorNoria).filter(([, r]) => r.afectadas.length > 0)

  const toggleNoria = (noria) => {
    setNoriasVisibles((prev) => ({ ...prev, [noria]: !prev[noria] }))
  }

  if (loading) return <p className="px-4 py-6 text-text-secondary">Cargando mapa de cazuelas…</p>
  if (error) return <p className="px-4 py-6 text-error">{error}</p>

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div
        style={{ height: '520px', width: '100%', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}
        className="lg:flex-1"
      >
        <BotonToggleCercas visible={cercasVisibles} onToggle={toggleCercas} />
        <MapContainer center={CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />

          {cercasVisibles && <CapaCercas />}

          {cazuelas
            .filter((c) => noriasVisibles[c.noria])
            .map((c) => {
              const config = NORIAS[c.noria]
              const posicion = [parseFloat(c.lat), parseFloat(c.lng)]
              return (
                <Fragment key={c.id}>
                  <CircleMarker
                    center={posicion}
                    radius={8}
                    pathOptions={{
                      color: c.activa ? config.color : '#f87171',
                      fillColor: config.color,
                      fillOpacity: c.activa ? 0.85 : 0.35,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', lineHeight: '1.6' }}>
                        <strong>{c.nombre}</strong>
                        <br />
                        Noria: {config.icono} {config.label}
                        <br />
                        Estado: {c.activa ? 'Activa' : '⚠️ Fuera de servicio'}
                        {c.notas && (
                          <>
                            <br />
                            Notas: {c.notas}
                          </>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                  {!c.activa && <Marker position={posicion} icon={ICONO_FALLA} interactive={false} />}
                </Fragment>
              )
            })}
        </MapContainer>
      </div>

      <aside className="flex w-full flex-col gap-3 lg:w-72">
        {noriasConFalla.length > 0 && (
          <div className="flex flex-col gap-2">
            {noriasConFalla.map(([noria, r]) => {
              const config = NORIAS[noria]
              return (
                <div
                  key={noria}
                  className="rounded-xl border-2 px-3 py-2 text-sm font-semibold"
                  style={{ borderColor: config.color, color: config.color, backgroundColor: `${config.color}1a` }}
                >
                  ⚠️ Falla detectada en Noria {config.label} — {r.afectadas.length} cazuela
                  {r.afectadas.length === 1 ? '' : 's'} afectada{r.afectadas.length === 1 ? '' : 's'}
                </div>
              )
            })}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-text">Norias</h2>
          <div className="flex flex-col gap-2">
            {Object.entries(NORIAS).map(([noria, config]) => {
              const r = resumenPorNoria[noria]
              const visible = noriasVisibles[noria]
              return (
                <button
                  key={noria}
                  type="button"
                  onClick={() => toggleNoria(noria)}
                  className={`flex items-center justify-between rounded-lg border-2 px-3 py-2 text-sm transition ${
                    visible ? 'border-border text-text' : 'border-border/50 text-text-secondary/60'
                  }`}
                >
                  <span>
                    {config.icono} Noria {config.label} — {r.total} cazuela{r.total === 1 ? '' : 's'}
                  </span>
                  <span className="text-xs font-bold">{visible ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              )
            })}
          </div>
        </div>

        {puedeVerDetalleFallas && noriasConFalla.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-text">Cazuelas afectadas</h2>
            <div className="flex flex-col gap-3">
              {noriasConFalla.map(([noria, r]) => (
                <div key={noria}>
                  <p className="text-xs font-bold text-text-secondary">
                    {NORIAS[noria].icono} Noria {NORIAS[noria].label}
                  </p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {r.afectadas.map((c) => (
                      <li key={c.id} className="text-sm text-text">
                        • {c.nombre}
                        {c.notas && <span className="text-text-secondary"> — {c.notas}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
