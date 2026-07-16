import { useCallback, useEffect, useState } from 'react'

import { getMovimientos } from '../../../api/inventario'
import { useAuth } from '../../../hooks/useAuth'
import { UNIDAD_LABELS } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

const ROLES_EXPORTAN = ['inventario', 'administrador', 'superadmin']

function formatFecha(fecha) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function exportarCSV(movimientos) {
  const encabezados = ['Fecha', 'Código', 'Descripción', 'Tipo', 'Cantidad', 'Responsable', 'Uso/Origen', 'Validado']
  const filas = movimientos.map((m) => [
    m.fecha_movimiento,
    m.producto_detalle?.codigo,
    m.producto_detalle?.descripcion,
    m.tipo,
    m.cantidad,
    m.responsable_detalle?.nombre,
    m.uso_descripcion?.replace(/\n/g, ' '),
    m.validado ? 'Sí' : m.rechazado ? 'Rechazado' : 'No',
  ])
  const csv = [encabezados, ...filas].map((fila) => fila.map((v) => `"${v ?? ''}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `movimientos_inventario_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function HistorialMovimientos({ onVolver }) {
  const { user } = useAuth()
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [fecha, setFecha] = useState('')
  const [tipo, setTipo] = useState('')

  const puedeExportar = ROLES_EXPORTAN.includes(user?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (fecha) params.fecha = fecha
      if (tipo) params.tipo = tipo
      const { data } = await getMovimientos(params)
      setMovimientos(data)
    } finally {
      setLoading(false)
    }
  }, [fecha, tipo])

  useEffect(() => { cargar() }, [cargar])

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
            <h1 className="font-bold text-highlight">Historial de movimientos</h1>
            <p className="text-xs text-text-secondary">{movimientos.length} registro{movimientos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-5">
        <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputClass}>
            <option value="">Todos los tipos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
          </select>
          {puedeExportar && (
            <button
              type="button"
              onClick={() => exportarCSV(movimientos)}
              disabled={movimientos.length === 0}
              style={{ minHeight: '48px' }}
              className="col-span-2 rounded-xl border border-accent px-4 text-sm font-bold text-highlight transition hover:bg-accent disabled:opacity-50 sm:col-span-1"
            >
              ⬇️ Exportar CSV
            </button>
          )}
        </div>

        {loading && <p className="text-center text-sm text-text-secondary">Cargando…</p>}

        {!loading && movimientos.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">📜</span>
            <p className="text-text-secondary">Sin movimientos registrados.</p>
          </div>
        )}

        {!loading && movimientos.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-card text-xs text-text-secondary">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Cantidad</th>
                  <th className="px-3 py-2">Responsable</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movimientos.map((m) => (
                  <tr key={m.id} className="text-text">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-text-secondary">{formatFecha(m.fecha_movimiento)}</td>
                    <td className="px-3 py-2">
                      <p className="font-mono text-xs text-text-secondary">{m.producto_detalle?.codigo}</p>
                      <p className="font-semibold">{m.producto_detalle?.descripcion}</p>
                    </td>
                    <td className="px-3 py-2">{m.tipo === 'entrada' ? '📥 Entrada' : '📤 Salida'}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono">
                      {m.cantidad} {UNIDAD_LABELS[m.producto_detalle?.unidad_medida]}
                    </td>
                    <td className="px-3 py-2 text-xs text-text-secondary">{m.responsable_detalle?.nombre}</td>
                    <td className="px-3 py-2 text-xs">
                      {m.rechazado ? (
                        <span className="text-error">Rechazado</span>
                      ) : m.validado ? (
                        <span className="text-highlight">Validado</span>
                      ) : (
                        <span className="text-warning">Sin validar</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
