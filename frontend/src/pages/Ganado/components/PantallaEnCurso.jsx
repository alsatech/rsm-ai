import { useEffect, useRef, useState } from 'react'

import { agregarParada, eliminarParada, getCorraletas } from '../../../api/ganado'
import { useToast } from '../../../hooks/useToast'
import MapaRecorrido from './MapaRecorrido'

function paradasParaMapa(paradas) {
  return paradas.map((p) => ({
    orden: p.orden,
    tipo: p.corraleta ? 'corraleta' : 'libre',
    corraleta_id: p.corraleta ?? null,
    lat: p.corraleta_detalle?.lat ?? p.lat ?? null,
    lng: p.corraleta_detalle?.lng ?? p.lng ?? null,
    nombre: p.corraleta_detalle?.nombre ?? p.nombre_libre ?? 'Punto libre',
  }))
}

export default function PantallaEnCurso({
  recorridoId,
  color,
  paradas,
  onParadasChange,
  onVolver,
  onFinalizar,
}) {
  const { showToast } = useToast()
  const [corraletas, setCorraletas] = useState([])
  const [showSheet, setShowSheet] = useState(false)
  const [tabActivo, setTabActivo] = useState('corraleta')
  const [nombreLibre, setNombreLibre] = useState('')
  const [latLibre, setLatLibre] = useState('')
  const [lngLibre, setLngLibre] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [deshaciendo, setDeshaciendo] = useState(false)
  const nombreRef = useRef(null)

  useEffect(() => {
    getCorraletas()
      .then(({ data }) => setCorraletas(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (showSheet && tabActivo === 'libre') {
      setTimeout(() => nombreRef.current?.focus(), 100)
    }
  }, [showSheet, tabActivo])

  const corraletasYaAgregadas = new Set(paradas.map((p) => p.corraleta).filter(Boolean))

  const handleAgregarCorraleta = async (c) => {
    if (agregando) return
    setAgregando(true)
    try {
      const { data } = await agregarParada(recorridoId, { corraleta: c.id })
      onParadasChange((prev) => [...prev, data])
      setShowSheet(false)
    } catch {
      showToast('No se pudo agregar la parada.', 'error')
    } finally {
      setAgregando(false)
    }
  }

  const handleAgregarLibre = async () => {
    if (!nombreLibre.trim()) {
      showToast('Escribe el nombre del lugar.', 'error')
      return
    }
    if (agregando) return
    setAgregando(true)
    try {
      const payload = { nombre_libre: nombreLibre.trim() }
      if (latLibre && lngLibre) {
        payload.lat = latLibre
        payload.lng = lngLibre
      }
      const { data } = await agregarParada(recorridoId, payload)
      onParadasChange((prev) => [...prev, data])
      setNombreLibre('')
      setLatLibre('')
      setLngLibre('')
      setShowSheet(false)
    } catch {
      showToast('No se pudo agregar la parada.', 'error')
    } finally {
      setAgregando(false)
    }
  }

  const handleDeshacer = async () => {
    if (!paradas.length || deshaciendo) return
    const ultima = [...paradas].sort((a, b) => b.orden - a.orden)[0]
    setDeshaciendo(true)
    try {
      await eliminarParada(recorridoId, ultima.id)
      onParadasChange((prev) => prev.filter((p) => p.id !== ultima.id))
    } catch {
      showToast('No se pudo deshacer la parada.', 'error')
    } finally {
      setDeshaciendo(false)
    }
  }

  const paradasOrdenadas = [...paradas].sort((a, b) => a.orden - b.orden)
  const mapaParadas = paradasParaMapa(paradasOrdenadas)

  return (
    <div className="min-h-svh bg-bg">
      {/* Header pulsando */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>
            <span className="font-bold text-highlight">En curso</span>
          </div>
          <span className="ml-auto text-sm text-text-secondary">
            {paradas.length} parada{paradas.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Mapa en vivo */}
        <MapaRecorrido
          corraletas={corraletas}
          paradas={mapaParadas}
          color={color}
          height="220px"
        />

        {/* Lista de paradas */}
        {paradasOrdenadas.length > 0 && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Ruta actual</p>
            {paradasOrdenadas.map((p) => {
              const nombre = p.corraleta_detalle?.nombre ?? p.nombre_libre ?? 'Punto libre'
              const esLibre = !p.corraleta
              return (
                <div key={p.id} className="flex items-center gap-2 text-sm text-text">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-highlight">
                    {p.orden}
                  </span>
                  <span className="flex-1">{nombre}</span>
                  {esLibre && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-secondary">
                      libre
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {paradas.length === 0 && (
          <p className="rounded-xl border border-border bg-card px-4 py-4 text-center text-sm text-text-secondary">
            Sin paradas aún. Agrega la primera parada del recorrido.
          </p>
        )}
      </div>

      {/* Botones inferiores */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg px-4 py-4 space-y-3">
        <button
          type="button"
          onClick={() => setShowSheet(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-base font-bold text-highlight transition hover:opacity-90"
        >
          + Agregar parada
        </button>
        <div className="flex gap-3">
          {paradas.length > 0 && (
            <button
              type="button"
              onClick={handleDeshacer}
              disabled={deshaciendo}
              className="flex-1 rounded-2xl border border-border py-3 text-sm font-semibold text-text-secondary transition hover:border-accent disabled:opacity-50"
            >
              {deshaciendo ? '...' : '↩ Deshacer'}
            </button>
          )}
          <button
            type="button"
            onClick={onFinalizar}
            disabled={paradas.length === 0}
            className="flex-1 rounded-2xl border border-highlight py-3 text-sm font-bold text-highlight transition hover:bg-accent disabled:opacity-40"
          >
            Finalizar →
          </button>
        </div>
      </div>
      <div className="h-36" />

      {/* Sheet: Agregar parada */}
      {showSheet && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
            onClick={() => setShowSheet(false)}
          />
          <div className="relative z-50 rounded-t-3xl border-t border-border bg-card px-4 pt-4 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold text-text">Agregar parada</p>
              <button
                type="button"
                onClick={() => setShowSheet(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-secondary"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex rounded-xl border border-border overflow-hidden">
              {['corraleta', 'libre'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTabActivo(tab)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition ${
                    tabActivo === tab
                      ? 'bg-accent text-highlight'
                      : 'text-text-secondary hover:text-text'
                  }`}
                >
                  {tab === 'corraleta' ? 'Del catálogo' : 'Lugar libre'}
                </button>
              ))}
            </div>

            {tabActivo === 'corraleta' && (
              <div className="max-h-64 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {corraletas.map((c) => {
                    const yaEsta = corraletasYaAgregadas.has(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => !yaEsta && handleAgregarCorraleta(c)}
                        disabled={yaEsta || agregando}
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${
                          yaEsta
                            ? 'border-accent bg-accent/20 text-highlight cursor-default'
                            : 'border-border text-text hover:border-highlight hover:text-highlight'
                        } disabled:opacity-60`}
                      >
                        {c.nombre}
                        {yaEsta && ' ✓'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {tabActivo === 'libre' && (
              <div className="space-y-3">
                <input
                  ref={nombreRef}
                  type="text"
                  value={nombreLibre}
                  onChange={(e) => setNombreLibre(e.target.value)}
                  placeholder="Nombre del lugar (ej: La lomita del aguaje)"
                  className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-sm text-text placeholder-text-secondary focus:border-highlight focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={latLibre}
                    onChange={(e) => setLatLibre(e.target.value)}
                    placeholder="Lat (opcional)"
                    step="0.0000001"
                    className="flex-1 rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder-text-secondary focus:border-highlight focus:outline-none"
                  />
                  <input
                    type="number"
                    value={lngLibre}
                    onChange={(e) => setLngLibre(e.target.value)}
                    placeholder="Lng (opcional)"
                    step="0.0000001"
                    className="flex-1 rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder-text-secondary focus:border-highlight focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAgregarLibre}
                  disabled={agregando}
                  className="flex w-full items-center justify-center rounded-2xl bg-accent py-3 text-sm font-bold text-highlight disabled:opacity-50"
                >
                  {agregando ? 'Agregando...' : 'Agregar lugar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
