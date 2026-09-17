import { useCallback, useEffect, useState } from 'react'

import { cancelarMovimiento, getMovimientos } from '../../../api/inventario'
import { useToast } from '../../../hooks/useToast'
import { UNIDAD_LABELS } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

// Las salidas aplican el descuento de stock de inmediato — no hay cola de "por validar".
// Esta vista es para corregir una salida mal capturada (producto o cantidad equivocada):
// se busca por fecha y se cancela con una nota, lo que revierte el stock.
export default function VistaCancelacion({ onVolver, onCambio }) {
  const { showToast } = useToast()
  const [fecha, setFecha] = useState(hoyISO)
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [notas, setNotas] = useState({})
  const [procesando, setProcesando] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getMovimientos({ tipo: 'salida', fecha })
      setMovimientos(data.filter((m) => !m.rechazado))
    } finally {
      setLoading(false)
    }
  }, [fecha])

  useEffect(() => { cargar() }, [cargar])

  const handleCancelar = async (movimiento) => {
    const nota = notas[movimiento.id] || ''
    if (!nota.trim()) {
      showToast('La cancelación requiere una nota explicando el motivo.', 'alerta')
      return
    }

    setProcesando(movimiento.id)
    try {
      await cancelarMovimiento(movimiento.id, { nota })
      showToast('⚠️ Salida cancelada — stock revertido', 'alerta')
      cargar()
      onCambio?.()
    } catch {
      showToast('No se pudo cancelar la salida.', 'error')
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
            <h1 className="font-bold text-highlight">Cancelar salidas</h1>
            <p className="text-xs text-text-secondary">{movimientos.length} salida{movimientos.length !== 1 ? 's' : ''} este día</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-5">
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={`${inputClass} mb-4`}
        />

        {loading && <p className="text-center text-sm text-text-secondary">Cargando…</p>}

        {!loading && movimientos.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">✅</span>
            <p className="text-text-secondary">No hay salidas por cancelar en esta fecha.</p>
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
                    📤 Salida
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
                    Uso: {movimiento.uso_descripcion}
                  </p>
                )}

                <input
                  value={notas[movimiento.id] || ''}
                  onChange={(e) => setNotas((prev) => ({ ...prev, [movimiento.id]: e.target.value }))}
                  placeholder="Motivo de la cancelación"
                  className={`${inputClass} mb-3`}
                />

                <button
                  type="button"
                  onClick={() => handleCancelar(movimiento)}
                  disabled={procesando === movimiento.id}
                  style={{ minHeight: '48px' }}
                  className="w-full rounded-xl border border-error text-sm font-bold text-error transition hover:bg-error/10 disabled:opacity-50"
                >
                  ✗ Cancelar salida
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
