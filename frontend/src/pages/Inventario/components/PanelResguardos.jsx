import { useState } from 'react'

import { cerrarResguardo } from '../../../api/inventario'
import { useToast } from '../../../hooks/useToast'
import { UNIDAD_LABELS } from '../constants'

// Lista los "guardado para después" sin cerrar — cada tarjeta se cierra desde aquí mismo
// marcando qué pasó, sin necesidad de volver a buscar el movimiento en el historial.
export default function PanelResguardos({ resguardos, onCerrado }) {
  const { showToast } = useToast()
  const [cerrando, setCerrando] = useState(null) // id del movimiento en proceso

  const cerrar = async (movimiento, resolucion) => {
    setCerrando(movimiento.id)
    try {
      await cerrarResguardo(movimiento.id, { resolucion })
      showToast(resolucion === 'usado' ? '✅ Marcado como usado' : '↩️ Regresó a inventario', 'exito')
      onCerrado?.()
    } catch (err) {
      showToast(err?.response?.data?.non_field_errors?.[0] || 'No se pudo cerrar.', 'error')
    } finally {
      setCerrando(null)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 font-bold text-text">📦 Material guardado sin cerrar</h2>

      {resguardos.length === 0 && (
        <p className="text-sm text-text-secondary">Nada pendiente de cerrar. 🎉</p>
      )}

      {resguardos.length > 0 && (
        <div className="flex flex-col gap-2">
          {resguardos.map((mov) => (
            <div key={mov.id} className="rounded-xl border border-warning bg-warning/10 px-3 py-2">
              <p className="text-sm font-semibold text-text">
                {mov.producto_detalle?.codigo} — {mov.producto_detalle?.descripcion}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {mov.cantidad} {UNIDAD_LABELS[mov.producto_detalle?.unidad_medida]} · 📍 {mov.resguardo_lugar}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {mov.responsable_detalle?.nombre} · {mov.fecha_movimiento}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => cerrar(mov, 'usado')}
                  disabled={cerrando === mov.id}
                  className="flex-1 rounded-lg border border-highlight px-2 py-1.5 text-xs font-semibold text-highlight transition hover:bg-highlight/10 disabled:opacity-50"
                >
                  ✅ Ya se usó
                </button>
                <button
                  type="button"
                  onClick={() => cerrar(mov, 'regresado')}
                  disabled={cerrando === mov.id}
                  className="flex-1 rounded-lg border border-accent px-2 py-1.5 text-xs font-semibold text-text transition hover:bg-accent/10 disabled:opacity-50"
                >
                  ↩️ Regresó
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
