import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

import { getUbicaciones } from '../../../api/inventario'
import { imprimirVariasEtiquetasT50M, soportaImpresionBluetooth } from '../../../lib/supvanPrinter'
import { UBICACION_ICONS, UBICACION_LABELS, construirPayloadQrUbicacion } from '../constants'

const ESTADO_LABELS = {
  conectando: 'Conectando…',
  generando_etiqueta: 'Generando etiqueta…',
  imprimiendo: 'Imprimiendo…',
}

// A diferencia de EtiquetasUbicacion.jsx (que imprime la etiqueta de cada PRODUCTO que vive en
// una ubicación), aquí el QR identifica a la ubicación misma — una sola etiqueta por anaquel o
// puerta. Al escanearla (botón "Escanear ubicación" en el encabezado de Inventario) se abre la
// lista de lo que hay ahí mismo en ese momento, sin pasar por ningún producto en particular.
export default function EtiquetasDeUbicaciones({ onCerrar }) {
  const [ubicaciones, setUbicaciones] = useState([])
  const [qrs, setQrs] = useState({})
  const [cargando, setCargando] = useState(true)
  const [estadoImpresionBt, setEstadoImpresionBt] = useState(null)
  const [progresoBt, setProgresoBt] = useState(null)
  const [errorImpresionBt, setErrorImpresionBt] = useState('')

  useEffect(() => {
    getUbicaciones()
      .then(({ data }) => setUbicaciones(data))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    if (!ubicaciones.length) return
    let cancelado = false
    Promise.all(
      ubicaciones.map((u) => {
        const label = UBICACION_LABELS[u.nombre] ?? u.nombre_display
        return QRCode.toDataURL(construirPayloadQrUbicacion(u.id, label), { width: 220, margin: 1 }).then(
          (url) => [u.id, url],
        )
      }),
    ).then((pares) => { if (!cancelado) setQrs(Object.fromEntries(pares)) })
    return () => { cancelado = true }
  }, [ubicaciones])

  const listo = ubicaciones.length > 0 && ubicaciones.every((u) => qrs[u.id])

  const imprimirEnT50M = async () => {
    setErrorImpresionBt('')
    try {
      // Reusa el lote de impresión pensado para productos: cada "producto" aquí es una
      // ubicación disfrazada, con su payload de ubicación como código para que el QR impreso
      // sea el correcto. ubicacionLabel='' porque ya va el nombre en la descripción.
      const pseudoProductos = ubicaciones.map((u) => {
        const label = UBICACION_LABELS[u.nombre] ?? u.nombre_display
        return {
          id: u.id,
          codigo: construirPayloadQrUbicacion(u.id, label),
          descripcion: `Ubicación: ${label}`,
        }
      })
      await imprimirVariasEtiquetasT50M(pseudoProductos, (estado, info) => {
        setEstadoImpresionBt(estado)
        setProgresoBt(info)
      }, '')
      setTimeout(() => { setEstadoImpresionBt(null); setProgresoBt(null) }, 2000)
    } catch (err) {
      setEstadoImpresionBt('error')
      setErrorImpresionBt(err?.message || 'No se pudo imprimir en el T50M.')
    }
  }

  const imprimiendoBt = Boolean(estadoImpresionBt) && estadoImpresionBt !== 'error'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 print:static print:bg-white">
      <div className="flex flex-col gap-3 border-b border-border bg-card px-4 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-text">Etiquetas de ubicación</h2>
            <p className="text-xs text-text-secondary">
              Pégalas en cada área — al escanearlas se abre lo que hay ahí en ese momento.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCerrar}
              style={{ minHeight: '44px' }}
              className="rounded-xl border border-border px-4 text-sm text-text-secondary transition hover:border-text-secondary hover:text-text"
            >
              Cerrar
            </button>
            {soportaImpresionBluetooth() && (
              <button
                type="button"
                onClick={imprimirEnT50M}
                disabled={!listo || imprimiendoBt}
                style={{ minHeight: '44px' }}
                className="rounded-xl border border-dashed border-accent px-4 text-sm font-semibold text-highlight transition hover:bg-bg disabled:opacity-50"
              >
                {imprimiendoBt
                  ? `${ESTADO_LABELS[estadoImpresionBt] ?? ''} ${progresoBt ? `(${progresoBt.indice + 1}/${progresoBt.total})` : ''}`
                  : '🖨️ Imprimir en T50M — experimental'}
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!listo}
              style={{ minHeight: '44px' }}
              className="rounded-xl bg-accent px-4 text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
            >
              🖨️ Imprimir en hoja
            </button>
          </div>
        </div>
      </div>

      {estadoImpresionBt === 'error' && (
        <p className="border-b border-error/40 bg-error/10 px-4 py-2 text-center text-xs text-error print:hidden">
          {errorImpresionBt}
        </p>
      )}

      <div className="flex-1 overflow-y-auto bg-white p-6 print:overflow-visible print:p-0">
        {cargando || !listo ? (
          <p className="text-center text-sm text-black/50">Generando etiquetas…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
            {ubicaciones.map((u) => (
              <div
                key={u.id}
                className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-4 print:break-inside-avoid print:border"
              >
                <img src={qrs[u.id]} alt={`Código QR de ${u.nombre}`} className="h-28 w-28" />
                <p className="text-center text-lg font-bold text-black">
                  {UBICACION_ICONS[u.nombre] ?? '📍'} {UBICACION_LABELS[u.nombre] ?? u.nombre_display}
                </p>
                <p className="text-center text-xs font-semibold text-black/60">Escanea para ver qué hay aquí</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
