import { useState } from 'react'

import { ESTADOS, PUNTOS_MEDICION, PUNTOS_PLUVIOMETRO } from '../constants'

const ESTADO_INICIAL = {
  punto_medicion: '',
  estado: '',
  nivel_pulgadas: '',
  caudal_m3h: '',
  presion_psi: '',
  lluvia_mm: '',
  observaciones: '',
}

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-text outline-none focus:border-highlight'
const labelClass = 'mb-1 block text-sm text-[#86ef69]'

export default function RegistroForm({ onGuardar, guardando }) {
  const [form, setForm] = useState(ESTADO_INICIAL)
  const [foto, setFoto] = useState(null)
  const [fotoInputKey, setFotoInputKey] = useState(0)

  const esPluviometro = PUNTOS_PLUVIOMETRO.includes(form.punto_medicion)
  const puedeGuardar = Boolean(form.punto_medicion && form.estado)

  const handleChange = (campo) => (event) => {
    setForm((prev) => ({ ...prev, [campo]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!puedeGuardar) return

    const data = new FormData()
    data.append('punto_medicion', form.punto_medicion)
    data.append('estado', form.estado)
    if (form.observaciones) data.append('observaciones', form.observaciones)

    if (esPluviometro) {
      if (form.lluvia_mm) data.append('lluvia_mm', form.lluvia_mm)
    } else {
      if (form.nivel_pulgadas) data.append('nivel_pulgadas', form.nivel_pulgadas)
      if (form.caudal_m3h) data.append('caudal_m3h', form.caudal_m3h)
      if (form.presion_psi) data.append('presion_psi', form.presion_psi)
    }

    if (foto) data.append('foto', foto)

    try {
      await onGuardar(data)
      setForm(ESTADO_INICIAL)
      setFoto(null)
      setFotoInputKey((key) => key + 1)
    } catch {
      // el toast de error ya se muestra en el componente padre
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <label className={labelClass} htmlFor="punto_medicion">
          Punto de medición
        </label>
        <select
          id="punto_medicion"
          value={form.punto_medicion}
          onChange={handleChange('punto_medicion')}
          required
          className={inputClass}
        >
          <option value="">Selecciona un punto</option>
          {PUNTOS_MEDICION.map((punto) => (
            <option key={punto.value} value={punto.value}>
              {punto.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className={labelClass}>Estado</p>
        <div className="grid grid-cols-3 gap-2">
          {ESTADOS.map((estado) => (
            <button
              key={estado.value}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, estado: estado.value }))}
              className={`rounded-lg border px-3 py-3 text-sm font-bold transition ${
                form.estado === estado.value ? estado.activeClassName : 'border-border text-text-secondary'
              }`}
            >
              {estado.label}
            </button>
          ))}
        </div>
      </div>

      {esPluviometro ? (
        <div>
          <label className={labelClass} htmlFor="lluvia_mm">
            Lluvia (mm)
          </label>
          <input
            id="lluvia_mm"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.lluvia_mm}
            onChange={handleChange('lluvia_mm')}
            className={inputClass}
            placeholder="0.00"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="nivel_pulgadas">
              Nivel (pulg)
            </label>
            <input
              id="nivel_pulgadas"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={form.nivel_pulgadas}
              onChange={handleChange('nivel_pulgadas')}
              className={inputClass}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="caudal_m3h">
              Caudal (m³/h)
            </label>
            <input
              id="caudal_m3h"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={form.caudal_m3h}
              onChange={handleChange('caudal_m3h')}
              className={inputClass}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="presion_psi">
              Presión (psi)
            </label>
            <input
              id="presion_psi"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={form.presion_psi}
              onChange={handleChange('presion_psi')}
              className={inputClass}
              placeholder="0.00"
            />
          </div>
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="observaciones">
          Observaciones
        </label>
        <textarea
          id="observaciones"
          value={form.observaciones}
          onChange={handleChange('observaciones')}
          rows={3}
          className={inputClass}
          placeholder="Notas adicionales (opcional)"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="foto">
          Foto (opcional)
        </label>
        <input
          key={fotoInputKey}
          id="foto"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => setFoto(event.target.files?.[0] ?? null)}
          className="w-full text-sm text-text-secondary"
        />
      </div>

      <button
        type="submit"
        disabled={!puedeGuardar || guardando}
        className="mt-2 rounded-lg bg-accent px-4 py-3 font-bold text-text transition hover:bg-highlight hover:text-bg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {guardando ? 'Guardando…' : 'Guardar registro'}
      </button>
    </form>
  )
}
