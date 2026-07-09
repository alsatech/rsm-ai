import { useState } from 'react'

import { CHECKLIST_GRUPOS, CHECKLIST_ITEMS_KEYS } from '../constants'

export default function Paso2Inspeccion({ form, setForm }) {
  const [abiertos, setAbiertos] = useState(() =>
    Object.fromEntries(CHECKLIST_GRUPOS.map((g) => [g.id, true]))
  )

  const totalVerificados = CHECKLIST_ITEMS_KEYS.filter((key) => form[key]).length
  const totalItems = CHECKLIST_ITEMS_KEYS.length + 1

  const toggleItem = (key) => setForm((prev) => ({ ...prev, [key]: !prev[key] }))
  const toggleGrupo = (id) => setAbiertos((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-bg px-4 py-2 text-center">
        <span className="text-sm font-semibold text-highlight">
          {totalVerificados} de {totalItems} ítems verificados
        </span>
      </div>

      {CHECKLIST_GRUPOS.map((grupo) => (
        <div key={grupo.id} className="rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={() => toggleGrupo(grupo.id)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            style={{ minHeight: '52px' }}
          >
            <span className="font-bold text-text">{grupo.titulo}</span>
            <span className="text-text-secondary">{abiertos[grupo.id] ? '▲' : '▼'}</span>
          </button>

          {abiertos[grupo.id] && (
            <div className="flex flex-col gap-1 border-t border-border px-4 py-3">
              {grupo.items.map((item) => (
                <label
                  key={item.key}
                  style={{ minHeight: '44px' }}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2 text-sm text-text hover:bg-bg/50"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(form[item.key])}
                    onChange={() => toggleItem(item.key)}
                    className="h-5 w-5 shrink-0 accent-highlight"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary" htmlFor="observaciones">
          Observaciones
        </label>
        <textarea
          id="observaciones"
          rows={3}
          value={form.observaciones}
          onChange={(e) => setForm((prev) => ({ ...prev, observaciones: e.target.value }))}
          className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight"
          placeholder="Notas adicionales (opcional)"
        />
      </div>
    </div>
  )
}
