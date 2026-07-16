import { useCallback, useEffect, useState } from 'react'

import { getMovimientos, validarMovimiento } from '../../../api/inventario'
import { useToast } from '../../../hooks/useToast'
import { UNIDAD_LABELS } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

export default function VistaValidacion({ onVolver, onCambio }) {
  const { showToast } = useToast()
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [notas, setNotas] = useState({})
  const [procesando, setProcesando] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getMovimientos({ validado: false })
      setMovimientos(data.filter((m) => !m.rechazado))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const handleAccion = async (movimiento, accion) => {
    const nota = notas[movimiento.id] || ''
    if (accion === 'rechazar' && !nota.trim()) {
      showToast('El rechazo requiere una nota explicando el motivo.', 'alerta')
      return
    }

    setProcesando(movimiento.id)
    try {
      await validarMovimiento(movimiento.id, { accion, nota })
      showToast(accion === 'validar' ? '✅ Movimiento validado' : '⚠️ Movimiento rechazado — stock revertido', accion === 'validar' ? 'exito' : 'alerta')
      cargar()
      onCambio?.()
    } catch {
      showToast('No se pudo procesar el movimiento.', 'error')
    } finally {
      setProcesando(null)
    }
  }

  return (
    <div className="min-h-svh bg-bg pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="font-bold text-highlight">Validar movimientos</h1>
            <p className="text-xs text-text-secondary">{movimientos.length} pendiente{movimientos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-5">
        {loading && <p className="text-center text-sm text-text-secondary">Cargando…</p>}

        {!loading && movimientos.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">✅</span>
            <p className="text-text-secondary">No hay movimientos pendientes de validar.</p>
          </div>
        )}

        {!loading && movimientos.length > 0 && (
          <div className="flex flex-col gap-4">
            {movimientos.map((movimiento) => (
              <div key={movimiento.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-text-secondary">{movimiento.producto_detalle?.codigo}</p>
                    <p className="font-bold text-text">{movimiento.producto_detalle?.descripcion}</p>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-xs font-bold text-text-secondary">
                    {movimiento.tipo === 'entrada' ? '📥 Entrada' : '📤 Salida'}
                  </span>
                </div>

                <p className="mb-1 font-mono text-sm text-text">
                  {movimiento.cantidad} {UNIDAD_LABELS[movimiento.producto_detalle?.unidad_medida]}
                </p>
                <p className="mb-1 text-xs text-text-secondary">
                  Reportado por: {movimiento.responsable_detalle?.nombre}
                </p>
                {movimiento.uso_descripcion && (
                  <p className="mb-3 text-xs text-text-secondary">
                    {movimiento.tipo === 'entrada' ? 'Origen' : 'Uso'}: {movimiento.uso_descripcion}
                  </p>
                )}

                <input
                  value={notas[movimiento.id] || ''}
                  onChange={(e) => setNotas((prev) => ({ ...prev, [movimiento.id]: e.target.value }))}
                  placeholder="Nota (obligatoria si rechazas)"
                  className={`${inputClass} mb-3`}
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleAccion(movimiento, 'rechazar')}
                    disabled={procesando === movimiento.id}
                    style={{ minHeight: '48px' }}
                    className="flex-1 rounded-xl border border-error text-sm font-bold text-error transition hover:bg-error/10 disabled:opacity-50"
                  >
                    ✗ Rechazar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccion(movimiento, 'validar')}
                    disabled={procesando === movimiento.id}
                    style={{ minHeight: '48px' }}
                    className="flex-1 rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
                  >
                    ✓ Validar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
