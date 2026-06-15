import { useState } from 'react'

import { CHECKLIST_GENERADOR_ITEMS } from '../constants'

const ESTADO_INICIAL = {
  nivel_aceite: false,
  nivel_refrigerante: false,
  filtro_aire: false,
  sin_fugas: false,
  observaciones: '',
}

export default function ChecklistForm({ onGuardar, guardando }) {
  const [form, setForm] = useState(ESTADO_INICIAL)

  const handleToggle = (campo) => {
    setForm((prev) => ({ ...prev, [campo]: !prev[campo] }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      await onGuardar(form)
      setForm(ESTADO_INICIAL)
    } catch {
      // el toast de error ya se muestra en el componente padre
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-bg p-4">
      {CHECKLIST_GENERADOR_ITEMS.map((item) => (
        <label key={item.key} className="flex items-center gap-3 text-sm text-text">
          <input
            type="checkbox"
            checked={form[item.key]}
            onChange={() => handleToggle(item.key)}
            className="h-5 w-5 accent-highlight"
          />
          {item.label}
        </label>
      ))}

      <div>
        <label className="mb-1 block text-sm text-text-secondary" htmlFor="observaciones-checklist">
          Observaciones
        </label>
        <textarea
          id="observaciones-checklist"
          value={form.observaciones}
          onChange={(event) => setForm((prev) => ({ ...prev, observaciones: event.target.value }))}
          rows={2}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-text outline-none focus:border-highlight"
          placeholder="Notas adicionales (opcional)"
        />
      </div>

      <button
        type="submit"
        disabled={guardando}
        className="rounded-lg bg-accent px-4 py-2 font-bold text-text transition hover:bg-highlight hover:text-bg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {guardando ? 'Guardando…' : 'Guardar revisión'}
      </button>
    </form>
  )
}
