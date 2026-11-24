import { useState } from 'react'

import { getListaCompras } from '../../../api/inventario'
import { useToast } from '../../../hooks/useToast'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

// Fechas en hora local (toISOString() las movería a UTC y podría correrlas un día).
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function rangoPreset(tipo) {
  const hoy = new Date()
  const y = hoy.getFullYear()
  const m = hoy.getMonth()
  if (tipo === 'dia') return [iso(hoy), iso(hoy)]
  if (tipo === 'semana') {
    const lunes = new Date(y, m, hoy.getDate() - ((hoy.getDay() + 6) % 7))
    return [iso(lunes), iso(hoy)]
  }
  if (tipo === 'quincena') {
    return hoy.getDate() <= 15 ? [iso(new Date(y, m, 1)), iso(new Date(y, m, 15))] : [iso(new Date(y, m, 16)), iso(new Date(y, m + 1, 0))]
  }
  return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))] // mes
}

const PRESETS = [
  ['dia', 'Hoy'],
  ['semana', 'Semana'],
  ['quincena', 'Quincena'],
  ['mes', 'Mes'],
]

export default function ListaComprasAlacena({ onCerrar }) {
  const { showToast } = useToast()
  const [[desde, hasta], setRango] = useState(() => rangoPreset('dia'))
  const [generando, setGenerando] = useState(false)

  const descargar = async () => {
    if (!desde || !hasta || desde > hasta) {
      showToast('Revisa las fechas: la inicial no puede ser posterior a la final.', 'error')
      return
    }
    setGenerando(true)
    try {
      const { data } = await getListaCompras({ desde, hasta })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `lista_compras_alacena_${desde}_${hasta}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      showToast('No se pudo generar la lista de compras.', 'error')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-text">🛒 Lista de compras — Alacena</h2>
          <button type="button" onClick={onCerrar} className="px-2 text-text-secondary" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="mb-3 grid grid-cols-4 gap-2">
          {PRESETS.map(([tipo, etiqueta]) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setRango(rangoPreset(tipo))}
              style={{ minHeight: '44px' }}
              className="rounded-lg border border-border text-xs font-semibold text-text-secondary transition hover:border-accent hover:text-text"
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <label className="text-xs text-text-secondary">
            Desde
            <input type="date" value={desde} onChange={(e) => setRango([e.target.value, hasta])} className={inputClass} />
          </label>
          <label className="text-xs text-text-secondary">
            Hasta
            <input type="date" value={hasta} onChange={(e) => setRango([desde, e.target.value])} className={inputClass} />
          </label>
        </div>

        <p className="mb-4 text-xs text-text-secondary">
          Comprar = Stock − Existencia al cierre de la fecha final. El consumo es lo que salió dentro del rango.
        </p>

        <button
          type="button"
          onClick={descargar}
          disabled={generando}
          style={{ minHeight: '52px' }}
          className="w-full rounded-xl bg-accent px-6 text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
        >
          {generando ? 'Generando…' : '📄 Descargar PDF'}
        </button>
      </div>
    </div>
  )
}
