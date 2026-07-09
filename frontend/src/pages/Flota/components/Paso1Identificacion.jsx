import { useEffect, useState } from 'react'

import { getUsuarios } from '../../../api/flota'
import { TIPO_ICONOS } from '../constants'

function colorCombustible(valor) {
  if (valor < 25) return { bar: 'bg-error', text: 'text-error' }
  if (valor <= 50) return { bar: 'bg-warning', text: 'text-warning' }
  return { bar: 'bg-highlight', text: 'text-highlight' }
}

export default function Paso1Identificacion({ vehiculos, form, setForm, usuarioActual }) {
  const [usuariosCampo, setUsuariosCampo] = useState([])

  useEffect(() => {
    getUsuarios()
      .then(({ data }) => {
        const campo = data.filter((u) => u.rol === 'campo')
        setUsuariosCampo(campo)

        if (usuarioActual?.rol === 'campo' && !form.responsable) {
          const yo = campo.find((u) => u.username === usuarioActual.username)
          if (yo) setForm((prev) => ({ ...prev, responsable: yo.id }))
        }
      })
      .catch(() => setUsuariosCampo([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const combustibleConf = colorCombustible(form.nivel_combustible)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">Vehículo *</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {vehiculos.map((v) => {
            const sel = form.vehiculo === v.id
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, vehiculo: v.id }))}
                style={{ minHeight: '88px' }}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition ${
                  sel ? 'border-highlight bg-highlight/10' : 'border-border hover:border-text-secondary'
                }`}
              >
                {v.foto ? (
                  <img src={v.foto} alt={v.nombre} className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <span className="text-2xl">{TIPO_ICONOS[v.tipo] ?? '🚗'}</span>
                )}
                <span className="text-sm font-semibold text-text">{v.nombre}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">Tipo de reporte *</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, tipo_reporte: 'salida' }))}
            style={{ minHeight: '56px' }}
            className={`rounded-xl border-2 text-base font-bold transition ${
              form.tipo_reporte === 'salida'
                ? 'border-highlight bg-highlight/10 text-highlight'
                : 'border-border text-text-secondary hover:border-text-secondary'
            }`}
          >
            🚗 Salida
          </button>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, tipo_reporte: 'llegada' }))}
            style={{ minHeight: '56px' }}
            className={`rounded-xl border-2 text-base font-bold transition ${
              form.tipo_reporte === 'llegada'
                ? 'border-highlight bg-highlight/10 text-highlight'
                : 'border-border text-text-secondary hover:border-text-secondary'
            }`}
          >
            🏁 Llegada
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary" htmlFor="responsable">
          Responsable *
        </label>
        <select
          id="responsable"
          value={form.responsable ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, responsable: Number(e.target.value) }))}
          className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight"
        >
          <option value="" disabled>Selecciona quién usó el vehículo</option>
          {usuariosCampo.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}{u.username === usuarioActual?.username ? ' (tú)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary" htmlFor="km_reporte">
          Kilometraje actual *
        </label>
        <div className="flex items-center gap-2">
          <input
            id="km_reporte"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.km_reporte}
            onChange={(e) => setForm((prev) => ({ ...prev, km_reporte: e.target.value }))}
            className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-lg font-mono text-text outline-none focus:border-highlight"
            placeholder="0"
          />
          <span className="text-sm font-semibold text-text-secondary">km</span>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary" htmlFor="nivel_combustible">
            Nivel de combustible
          </label>
          <span className={`font-mono text-sm font-bold ${combustibleConf.text}`}>{form.nivel_combustible}%</span>
        </div>
        <input
          id="nivel_combustible"
          type="range"
          min="0"
          max="100"
          value={form.nivel_combustible}
          onChange={(e) => setForm((prev) => ({ ...prev, nivel_combustible: Number(e.target.value) }))}
          className="w-full accent-highlight"
        />
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-border/40">
          <div
            className={`h-full rounded-full transition-all ${combustibleConf.bar}`}
            style={{ width: `${form.nivel_combustible}%` }}
          />
        </div>
      </div>
    </div>
  )
}
