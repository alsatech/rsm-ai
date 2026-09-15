import { useCallback, useEffect, useState } from 'react'

import { generarRelacion, getFacturasPorMes, getRelaciones } from '../../../api/facturacion'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import {
  MODULO_ORIGEN_ICONOS,
  MODULO_ORIGEN_LABELS,
  formatFecha,
  formatMesLabel,
  formatMoneda,
  mesActualISO,
} from '../constants'

function descargarBlob(url, nombreArchivo) {
  return fetch(url)
    .then((resp) => resp.blob())
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = nombreArchivo
      link.click()
      URL.revokeObjectURL(objectUrl)
    })
}

export default function DashboardFacturacion() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [mes, setMes] = useState(mesActualISO)
  const [facturas, setFacturas] = useState([])
  const [relaciones, setRelaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)

  const esSuperadmin = user?.rol === 'superadmin'

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [respFacturas, respRelaciones] = await Promise.all([
        getFacturasPorMes(mes),
        getRelaciones(),
      ])
      setFacturas(respFacturas.data)
      setRelaciones(respRelaciones.data.slice(0, 12))
    } finally {
      setLoading(false)
    }
  }, [mes])

  useEffect(() => { cargar() }, [cargar])

  const total = facturas.reduce((acc, f) => acc + Number(f.importe), 0)
  const desglose = Object.entries(
    facturas.reduce((acc, f) => {
      acc[f.modulo_origen] = (acc[f.modulo_origen] ?? 0) + Number(f.importe)
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])
  const maxDesglose = Math.max(...desglose.map(([, v]) => v), 1)

  const handleGenerar = async () => {
    setGenerando(true)
    try {
      const { data } = await generarRelacion(mes)
      await descargarBlob(data.archivo_excel, `Relacion_${mes}_RSM.xlsx`)
      showToast(`✅ Relación de ${formatMesLabel(mes)} generada — ${data.numero_facturas} facturas`, 'exito')
      cargar()
    } catch (err) {
      showToast(err?.response?.data?.detail || 'No se pudo generar la relación.', 'error')
    } finally {
      setGenerando(false)
    }
  }

  const handleDescargarRelacion = (relacion) => {
    if (!relacion.archivo_excel) return
    descargarBlob(relacion.archivo_excel, `Relacion_${relacion.mes}_RSM.xlsx`)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label htmlFor="mes_dashboard" className="mb-1 block text-sm font-medium text-text-secondary">
          Mes
        </label>
        <input
          id="mes_dashboard"
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          style={{ minHeight: '48px' }}
          className="w-full rounded-lg border border-border bg-bg px-4 text-base text-text outline-none focus:border-highlight sm:w-64"
        />
      </div>

      {loading ? (
        <p className="text-center text-sm text-text-secondary">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-text-secondary">💰 Total del mes</p>
              <p className="mt-1 text-2xl font-bold text-highlight">{formatMoneda(total)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-text-secondary">📄 Número de facturas</p>
              <p className="mt-1 text-2xl font-bold text-text">{facturas.length}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-semibold text-text">📊 Desglose por módulo</p>
            {desglose.length === 0 ? (
              <p className="text-sm text-text-secondary">Sin facturas registradas para este mes.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {desglose.map(([modulo, valor]) => (
                  <div key={modulo}>
                    <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                      <span>{MODULO_ORIGEN_ICONOS[modulo] ?? '📎'} {MODULO_ORIGEN_LABELS[modulo] ?? modulo}</span>
                      <span className="font-mono">{formatMoneda(valor)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
                      <div
                        className="h-full rounded-full bg-highlight transition-all"
                        style={{ width: `${(valor / maxDesglose) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {esSuperadmin && (
            <button
              type="button"
              onClick={handleGenerar}
              disabled={generando || facturas.length === 0}
              style={{ minHeight: '56px' }}
              className="w-full rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generando ? 'Generando…' : `📊 Generar relación Excel — ${formatMesLabel(mes)}`}
            </button>
          )}

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-semibold text-text">Historial de relaciones generadas</p>
            {relaciones.length === 0 ? (
              <p className="text-sm text-text-secondary">Sin relaciones generadas todavía.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {relaciones.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold capitalize text-text">{formatMesLabel(r.mes)}</p>
                      <p className="text-xs text-text-secondary">
                        {r.numero_facturas} facturas · {formatMoneda(r.total)} · {formatFecha(r.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDescargarRelacion(r)}
                      style={{ minHeight: '40px' }}
                      className="shrink-0 rounded-lg border border-accent px-3 text-xs font-bold text-highlight transition hover:bg-accent"
                    >
                      ⬇️ Descargar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
