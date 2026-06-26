import { useEffect, useState } from 'react'

import { getUsuarios } from '../../../api/pendientes'
import { COLOR_LABELS, COLOR_MAP, ESTADO_CONFIG } from './colorConfig'

const COLORES = Object.keys(COLOR_MAP)
const ESTADOS = ['bien', 'alerta', 'critico']

export default function Paso1Info({ data, onChange, currentUser }) {
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => {
    getUsuarios()
      .then(({ data: lista }) => setUsuarios(lista))
      .catch(() => {})
  }, [])

  const otrosUsuarios = usuarios.filter((u) => u.id !== currentUser?.id)

  const toggleAsistente = (id) => {
    const actual = data.asistentes ?? []
    if (actual.includes(id)) {
      onChange('asistentes', actual.filter((a) => a !== id))
    } else {
      onChange('asistentes', [...actual, id])
    }
  }

  return (
    <div className="space-y-6">
      {/* Fecha */}
      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">Fecha</label>
        <input
          type="date"
          value={data.fecha}
          onChange={(e) => onChange('fecha', e.target.value)}
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-text focus:border-highlight focus:outline-none"
        />
      </div>

      {/* Número de cabezas */}
      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">
          Número de cabezas <span className="text-xs opacity-60">(opcional)</span>
        </label>
        <input
          type="number"
          min="0"
          value={data.numero_cabezas}
          onChange={(e) => onChange('numero_cabezas', e.target.value)}
          placeholder="Ej: 45"
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-text focus:border-highlight focus:outline-none"
        />
      </div>

      {/* Estado del hato */}
      <div>
        <label className="mb-2 block text-sm font-medium text-text-secondary">
          Estado del hato <span className="text-error">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {ESTADOS.map((e) => {
            const cfg = ESTADO_CONFIG[e]
            const activo = data.estado_hato === e
            return (
              <button
                key={e}
                type="button"
                onClick={() => onChange('estado_hato', e)}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl border-2 px-2 py-3 text-sm font-semibold transition ${
                  activo
                    ? `${cfg.border} ${cfg.text} bg-card`
                    : 'border-border text-text-secondary hover:border-accent'
                }`}
              >
                <span className="mb-1 text-xl">{cfg.icon}</span>
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Color del recorrido */}
      <div>
        <label className="mb-2 block text-sm font-medium text-text-secondary">
          Color del recorrido
        </label>
        <div className="flex flex-wrap gap-3">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange('color', c)}
              title={COLOR_LABELS[c]}
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                data.color === c ? 'border-text scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: COLOR_MAP[c] }}
            >
              {data.color === c && (
                <span className="text-sm font-bold text-bg">✓</span>
              )}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-text-secondary">{COLOR_LABELS[data.color]}</p>
      </div>

      {/* Narrativa */}
      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">
          Narrativa del recorrido <span className="text-error">*</span>
        </label>
        <textarea
          value={data.narrativa}
          onChange={(e) => onChange('narrativa', e.target.value)}
          rows={4}
          placeholder="Cuéntanos qué pasó en el recorrido (ej: salieron de los corrales nuevos al callejón y de ahí hacia la 1A Norte...)"
          className="w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm text-text placeholder-text-secondary focus:border-highlight focus:outline-none"
        />
      </div>

      {/* Observaciones */}
      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">
          Observaciones <span className="text-xs opacity-60">(opcional)</span>
        </label>
        <textarea
          value={data.observaciones}
          onChange={(e) => onChange('observaciones', e.target.value)}
          rows={2}
          placeholder="Novedades, incidencias, etc."
          className="w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm text-text placeholder-text-secondary focus:border-highlight focus:outline-none"
        />
      </div>

      {/* Asistentes */}
      {otrosUsuarios.length > 0 && (
        <div>
          <label className="mb-2 block text-sm font-medium text-text-secondary">
            Asistentes adicionales <span className="text-xs opacity-60">(opcional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {otrosUsuarios.map((u) => {
              const seleccionado = (data.asistentes ?? []).includes(u.id)
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAsistente(u.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    seleccionado
                      ? 'border-highlight bg-accent text-highlight'
                      : 'border-border text-text-secondary hover:border-accent'
                  }`}
                >
                  {u.nombre}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
