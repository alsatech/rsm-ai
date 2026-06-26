import { useEffect, useState } from 'react'

import { getCorraletas, getRecorrido } from '../../../api/ganado'
import { COLOR_MAP, ESTADO_CONFIG } from './colorConfig'
import MapaRecorrido from './MapaRecorrido'

function formatFecha(fecha) {
  if (!fecha) return ''
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}

export default function DetalleRecorrido({ id, onVolver }) {
  const [recorrido, setRecorrido] = useState(null)
  const [corraletas, setCorraletas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fotoAbierta, setFotoAbierta] = useState(null)

  useEffect(() => {
    Promise.all([getRecorrido(id), getCorraletas()])
      .then(([{ data: r }, { data: cs }]) => {
        setRecorrido(r)
        setCorraletas(cs)
      })
      .catch(() => setError('No se pudo cargar el recorrido.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-bg">
        <p className="text-text-secondary">Cargando...</p>
      </div>
    )
  }

  if (error || !recorrido) {
    return (
      <div className="min-h-svh bg-bg px-4 py-6">
        <button onClick={onVolver} className="mb-4 text-sm text-text-secondary">← Volver</button>
        <p className="text-center text-error">{error || 'No encontrado.'}</p>
      </div>
    )
  }

  const estado = ESTADO_CONFIG[recorrido.estado_hato] ?? ESTADO_CONFIG.bien
  const lineColor = COLOR_MAP[recorrido.color] ?? '#60a5fa'
  const paradasSeleccionadas = (recorrido.paradas ?? []).map((p) => ({
    id: p.corraleta,
    lat: p.corraleta_detalle?.lat,
    lng: p.corraleta_detalle?.lng,
    nombre: p.corraleta_detalle?.nombre,
  }))

  return (
    <div className="min-h-svh bg-bg">
      {/* Header */}
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
            <h1 className="font-bold text-highlight">
              Recorrido {formatFecha(recorrido.fecha)}
            </h1>
            <p className="text-xs text-text-secondary">
              {recorrido.responsable_detalle?.nombre}
            </p>
          </div>
          <div className={`ml-auto flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold ${estado.border} ${estado.text}`}>
            {estado.icon} {estado.label}
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Mapa */}
        <MapaRecorrido
          corraletas={corraletas}
          paradasSeleccionadas={paradasSeleccionadas}
          color={recorrido.color}
          readOnly
          height="300px"
        />

        {/* Ruta */}
        {recorrido.paradas?.length > 0 && (
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">Ruta</p>
            <div className="flex flex-col gap-1">
              {recorrido.paradas.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 text-sm text-text">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-bg"
                    style={{ backgroundColor: lineColor }}
                  >
                    {i + 1}
                  </span>
                  {p.corraleta_detalle?.nombre}
                  {p.hora_llegada && (
                    <span className="ml-auto font-mono text-xs text-text-secondary">
                      {p.hora_llegada}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="rounded-xl border border-border bg-card px-4 py-4 space-y-3">
          <div>
            <p className="text-xs text-text-secondary">Responsable</p>
            <p className="text-sm text-text">{recorrido.responsable_detalle?.nombre}</p>
          </div>
          {recorrido.asistentes_detalle?.length > 0 && (
            <div>
              <p className="text-xs text-text-secondary">Asistentes</p>
              <p className="text-sm text-text">
                {recorrido.asistentes_detalle.map((a) => a.nombre).join(', ')}
              </p>
            </div>
          )}
          {recorrido.numero_cabezas && (
            <div>
              <p className="text-xs text-text-secondary">Cabezas</p>
              <p className="text-sm text-text">🐄 {recorrido.numero_cabezas}</p>
            </div>
          )}
        </div>

        {/* Narrativa */}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">Narrativa</p>
          <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-text leading-relaxed">
            {recorrido.narrativa}
          </p>
        </div>

        {/* Observaciones */}
        {recorrido.observaciones && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">Observaciones</p>
            <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-text leading-relaxed">
              {recorrido.observaciones}
            </p>
          </div>
        )}

        {/* Fotos */}
        {recorrido.fotos?.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Fotos ({recorrido.fotos.length})
            </p>
            <div className="grid grid-cols-2 gap-3">
              {recorrido.fotos.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFotoAbierta(f.foto)}
                  className="aspect-square overflow-hidden rounded-xl border border-border"
                >
                  <img
                    src={f.foto}
                    alt={f.descripcion || 'Foto recorrido'}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {fotoAbierta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/95"
          onClick={() => setFotoAbierta(null)}
        >
          <img
            src={fotoAbierta}
            alt="Foto ampliada"
            className="max-h-[90svh] max-w-full rounded-xl object-contain"
          />
          <button
            type="button"
            onClick={() => setFotoAbierta(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-card text-error text-lg"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
