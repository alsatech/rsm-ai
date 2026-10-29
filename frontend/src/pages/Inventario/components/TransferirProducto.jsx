import { useState } from 'react'

import { transferirProducto } from '../../../api/inventario'
import { useToast } from '../../../hooks/useToast'
import { UBICACION_LABELS, UNIDAD_LABELS } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

// Caso raro: el material ya está físicamente en otra bodega y hay que corregirlo en el
// sistema. Solo mueve TODO el stock del producto — no hay transferencias parciales.
export default function TransferirProducto({ producto, ubicaciones, onGuardado, onCerrar }) {
  const { showToast } = useToast()
  const [ubicacionDestino, setUbicacionDestino] = useState('')
  const [guardando, setGuardando] = useState(false)

  const opciones = ubicaciones.filter((u) => u.id !== producto.ubicacion_detalle?.id)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!ubicacionDestino) return
    setGuardando(true)
    try {
      await transferirProducto(producto.id, { ubicacion_destino: ubicacionDestino })
      showToast('🔄 Material transferido', 'exito')
      onGuardado?.()
    } catch {
      showToast('No se pudo transferir el material.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-[scaleIn_0.15s_ease-out] rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="mb-1 text-xl font-bold text-text">🔄 Transferir material</h2>
        <p className="mb-4 text-sm text-text-secondary">
          Mueve <span className="font-semibold text-text">todo</span> el stock de "{producto.descripcion}"
          ({Number(producto.stock_actual).toLocaleString('es-MX')} {UNIDAD_LABELS[producto.unidad_medida]})
          de {UBICACION_LABELS[producto.ubicacion_detalle?.nombre] ?? 'su ubicación actual'} a otra ubicación.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <select
            required
            value={ubicacionDestino}
            onChange={(e) => setUbicacionDestino(e.target.value)}
            className={inputClass}
            autoFocus
          >
            <option value="">Selecciona la ubicación destino…</option>
            {opciones.map((u) => (
              <option key={u.id} value={u.id}>{UBICACION_LABELS[u.nombre] ?? u.nombre_display}</option>
            ))}
          </select>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCerrar}
              style={{ minHeight: '52px' }}
              className="flex-1 rounded-xl border border-border text-text-secondary transition hover:border-text-secondary hover:text-text"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!ubicacionDestino || guardando}
              style={{ minHeight: '52px' }}
              className="flex-1 rounded-xl bg-accent font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? 'Transfiriendo…' : 'Transferir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
