import { useState } from 'react'

import { ESTADO_CAMBIO_ACEITE_CONFIG } from '../constants'

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(`${fecha}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

const ESTADO_VACIO = { fecha: hoyISO(), estado: 'realizado', km_horas: '', observaciones: '' }

export default function BitacoraAceite({ cambios, unidad, puedeRegistrar, onRegistrar, guardando }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(ESTADO_VACIO)

  const handleChange = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onRegistrar({
      fecha: form.fecha,
      estado: form.estado,
      km_horas: form.km_horas === '' ? null : form.km_horas,
      observaciones: form.observaciones,
    })
    setForm(ESTADO_VACIO)
    setMostrarForm(false)
  }

  return (
    <div className="flex flex-col gap-3">
      {puedeRegistrar && !mostrarForm && (
        <button
          type="button"
          onClick={() => setMostrarForm(true)}
          style={{ minHeight: '48px' }}
          className="flota-cta-primary rounded-xl text-sm"
        >
          + Registrar cambio de aceite
        </button>
      )}

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-flotafg-muted/20 bg-flotabg/50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-flotafg-muted" htmlFor="cambio-fecha">Fecha</label>
              <input
                id="cambio-fecha"
                type="date"
                required
                value={form.fecha}
                onChange={handleChange('fecha')}
                className="mt-1 w-full rounded-lg border border-flotafg-muted/30 bg-flotabg/60 px-3 py-2 text-sm text-flotafg outline-none focus:border-highlight"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-flotafg-muted" htmlFor="cambio-estado">Estado</label>
              <select
                id="cambio-estado"
                value={form.estado}
                onChange={handleChange('estado')}
                className="mt-1 w-full rounded-lg border border-flotafg-muted/30 bg-flotabg/60 px-3 py-2 text-sm text-flotafg outline-none focus:border-highlight"
              >
                {Object.entries(ESTADO_CAMBIO_ACEITE_CONFIG).map(([valor, cfg]) => (
                  <option key={valor} value={valor}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-flotafg-muted" htmlFor="cambio-km">
              {unidad === 'hrs' ? 'Horas (horómetro)' : 'Kilometraje'}
            </label>
            <input
              id="cambio-km"
              type="number"
              step="0.01"
              min="0"
              placeholder={unidad === 'hrs' ? 'Ej. 42.2' : 'Ej. 20246.6'}
              value={form.km_horas}
              onChange={handleChange('km_horas')}
              className="mt-1 w-full rounded-lg border border-flotafg-muted/30 bg-flotabg/60 px-3 py-2 text-sm text-flotafg outline-none focus:border-highlight"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-flotafg-muted" htmlFor="cambio-obs">Observaciones</label>
            <textarea
              id="cambio-obs"
              rows={2}
              placeholder="Ej. Se notificó el cambio, pendiente por falla en reparación…"
              value={form.observaciones}
              onChange={handleChange('observaciones')}
              className="mt-1 w-full rounded-lg border border-flotafg-muted/30 bg-flotabg/60 px-3 py-2 text-sm text-flotafg outline-none focus:border-highlight"
            />
          </div>

          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => { setMostrarForm(false); setForm(ESTADO_VACIO) }}
              style={{ minHeight: '44px' }}
              className="flex-1 rounded-xl border border-flotafg-muted/30 text-sm font-semibold text-flotafg-muted transition hover:text-flotafg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              style={{ minHeight: '44px' }}
              className="flota-cta-primary flex-1 rounded-xl text-sm disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {cambios.length === 0 ? (
        <p className="py-4 text-center text-sm text-flotafg-muted">Sin cambios de aceite registrados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {cambios.map((c, idx) => {
            const cfg = ESTADO_CAMBIO_ACEITE_CONFIG[c.estado] ?? ESTADO_CAMBIO_ACEITE_CONFIG.realizado
            return (
              <div
                key={c.id}
                style={{ animationDelay: `${idx * 30}ms` }}
                className="flota-fade-in rounded-xl border border-flotafg-muted/20 bg-flotabg/50 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-flotafg">{formatFecha(c.fecha)}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${cfg.border} ${cfg.text} ${cfg.bg}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
                {c.km_horas != null && (
                  <p className="mt-0.5 font-mono text-xs text-flotafg-muted">
                    {Number(c.km_horas).toLocaleString('es-MX')} {c.unidad ?? unidad}
                  </p>
                )}
                {c.observaciones && (
                  <p className="mt-1 text-xs text-flotafg-muted">{c.observaciones}</p>
                )}
                <p className="mt-1 text-[11px] text-flotafg-muted/70">
                  Registró: {c.registrado_por_detalle?.nombre ?? '—'}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
