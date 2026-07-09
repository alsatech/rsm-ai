import { useState } from 'react'

import { CHECKLIST_GRUPOS } from '../constants'

function formatFechaHora(fechaHora) {
  return new Date(fechaHora).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function DetalleChecklist({ checklist, puedeValidar, onValidar, guardando, onCerrar }) {
  const [fotoAmpliada, setFotoAmpliada] = useState(null)
  const [observacionesValidacion, setObservacionesValidacion] = useState(checklist.observaciones ?? '')

  const handleValidar = () => {
    onValidar({ validado: true, observaciones: observacionesValidacion })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg animate-[scaleIn_0.15s_ease-out] rounded-2xl border border-border bg-card p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-text">
              {checklist.tipo_reporte === 'salida' ? '🚗 Salida' : '🏁 Llegada'} — {checklist.vehiculo_detalle?.nombre}
            </h2>
            <p className="text-sm text-text-secondary">
              {checklist.responsable_detalle?.nombre} · {formatFechaHora(checklist.fecha_hora)}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-text-secondary hover:text-text"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg px-3 py-2 text-sm">
            <span className="font-mono text-text">{Number(checklist.km_reporte).toLocaleString('es-MX')} km</span>
            <span className="text-text-secondary">⛽ {checklist.nivel_combustible}%</span>
            <span className="font-semibold text-highlight">
              {checklist.items_verificados}/{checklist.total_items} ítems
            </span>
            {checklist.validado ? (
              <span className="ml-auto text-highlight">✅ Validado por {checklist.validado_por_detalle?.nombre}</span>
            ) : (
              <span className="ml-auto text-warning">⏳ Sin validar</span>
            )}
          </div>

          {CHECKLIST_GRUPOS.map((grupo) => (
            <div key={grupo.id}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {grupo.titulo}
              </p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {grupo.items.map((item) => (
                  <p key={item.key} className="flex items-center gap-2 text-sm text-text">
                    <span className={checklist[item.key] ? 'text-highlight' : 'text-error'}>
                      {checklist[item.key] ? '✓' : '✕'}
                    </span>
                    {item.label}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {checklist.observaciones && !puedeValidar && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">Observaciones</p>
              <p className="text-sm text-text">{checklist.observaciones}</p>
            </div>
          )}

          {checklist.fotos?.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Fotos ({checklist.fotos.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {checklist.fotos.map((foto) => (
                  <button
                    key={foto.id}
                    type="button"
                    onClick={() => setFotoAmpliada(foto)}
                    className="overflow-hidden rounded-lg border border-border"
                  >
                    <img src={foto.foto} alt={foto.descripcion || 'Foto de checklist'} className="h-20 w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {puedeValidar && !checklist.validado && (
            <div className="rounded-xl border border-border bg-bg p-3">
              <label className="mb-1 block text-sm font-medium text-text-secondary" htmlFor="obs-validacion">
                Observaciones de validación
              </label>
              <textarea
                id="obs-validacion"
                rows={2}
                value={observacionesValidacion}
                onChange={(e) => setObservacionesValidacion(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text outline-none focus:border-highlight"
                placeholder="Notas de la validación (opcional)"
              />
              <button
                type="button"
                onClick={handleValidar}
                disabled={guardando}
                style={{ minHeight: '48px' }}
                className="mt-3 w-full rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
              >
                {guardando ? 'Guardando…' : '✅ Validar checklist'}
              </button>
            </div>
          )}
        </div>
      </div>

      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/90 p-4"
          onClick={(e) => { e.stopPropagation(); setFotoAmpliada(null) }}
        >
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <img src={fotoAmpliada.foto} alt={fotoAmpliada.descripcion || 'Foto'} className="w-full rounded-xl" />
            <button
              onClick={() => setFotoAmpliada(null)}
              style={{ minHeight: '48px' }}
              className="mt-3 w-full rounded-xl border border-border py-3 text-text-secondary hover:text-text"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
