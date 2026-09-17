import { useEffect, useState } from 'react'

import { getReporteDiario, getResumenInventario } from '../../../api/inventario'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'

const ROLES_VISIBLES = ['inventario', 'administrador', 'superadmin']

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function ResumenInventario({ recargar }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [resumen, setResumen] = useState(null)
  const [fecha, setFecha] = useState(hoyISO)
  const [generando, setGenerando] = useState(false)
  const puedeVer = ROLES_VISIBLES.includes(user?.rol)

  useEffect(() => {
    if (!puedeVer) return
    getResumenInventario()
      .then(({ data }) => setResumen(data))
      .catch(() => setResumen(null))
  }, [puedeVer, recargar])

  if (!puedeVer || !resumen) return null

  const { total_productos, alertas_stock, movimientos_hoy } = resumen

  const descargarReporte = async () => {
    setGenerando(true)
    try {
      const { data } = await getReporteDiario({ fecha })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `reporte_inventario_${fecha}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      showToast('No se pudo generar el reporte diario.', 'error')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-text">📦 Inventario</p>
        <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-mono text-highlight">
          {total_productos} productos
        </span>
      </div>

      <div className="space-y-1 text-xs text-text-secondary">
        <p>🔴 {alertas_stock} producto{alertas_stock !== 1 ? 's' : ''} en alerta de stock</p>
        <p>🔄 {movimientos_hoy} movimiento{movimientos_hoy !== 1 ? 's' : ''} hoy</p>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-2 text-xs font-semibold text-text-secondary">Reporte diario</p>
        <div className="flex gap-2">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-bg px-2 py-2 text-xs text-text outline-none focus:border-highlight"
          />
          <button
            type="button"
            onClick={descargarReporte}
            disabled={generando}
            style={{ minHeight: '36px' }}
            className="shrink-0 rounded-lg border border-accent px-3 text-xs font-bold text-highlight transition hover:bg-accent disabled:opacity-50"
          >
            {generando ? 'Generando…' : '📄 Descargar PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
