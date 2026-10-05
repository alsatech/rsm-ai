import html2canvas from 'html2canvas'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'

import { imprimirEtiquetaT50M, soportaImpresionBluetooth } from '../../../lib/supvanPrinter'
import { UBICACION_ICONS, UBICACION_LABELS } from '../constants'

const ESTADO_LABELS = {
  conectando: 'Conectando…',
  generando_etiqueta: 'Generando etiqueta…',
  imprimiendo: 'Imprimiendo…',
}

// Genera una etiqueta con el código QR del producto (a partir de su código actual, ej. SM-001)
// para imprimir y pegar en el bote/anaquel — sin esto, el escáner de SalidaFacil.jsx no tiene
// nada físico que leer todavía.
export default function EtiquetaProducto({ producto, onCerrar }) {
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [barcodeDataUrl, setBarcodeDataUrl] = useState(null)
  const [vista, setVista] = useState('qr') // 'qr' | 'barras'
  const etiquetaRef = useRef(null)
  const [descargando, setDescargando] = useState(false)
  const [estadoImpresionBt, setEstadoImpresionBt] = useState(null) // null | 'conectando' | ... | 'error'
  const [errorImpresionBt, setErrorImpresionBt] = useState('')

  useEffect(() => {
    let cancelado = false
    QRCode.toDataURL(producto.codigo, { width: 320, margin: 1 })
      .then((url) => { if (!cancelado) setQrDataUrl(url) })
      .catch(() => {})
    return () => { cancelado = true }
  }, [producto.codigo])

  useEffect(() => {
    const canvas = document.createElement('canvas')
    try {
      JsBarcode(canvas, producto.codigo, { format: 'CODE128', displayValue: false, width: 2, height: 60, margin: 0 })
      setBarcodeDataUrl(canvas.toDataURL('image/png'))
    } catch {
      setBarcodeDataUrl(null)
    }
  }, [producto.codigo])

  const ubicacionNombre = producto.ubicacion_detalle?.nombre
  const ubicacionLabel = ubicacionNombre ? UBICACION_LABELS[ubicacionNombre] ?? producto.ubicacion_detalle?.nombre_display : ''

  const imprimirEnT50M = async () => {
    setErrorImpresionBt('')
    try {
      await imprimirEtiquetaT50M(
        { codigo: producto.codigo, descripcion: producto.descripcion, ubicacion: ubicacionLabel },
        (estado) => setEstadoImpresionBt(estado),
      )
      setTimeout(() => setEstadoImpresionBt(null), 2000)
    } catch (err) {
      setEstadoImpresionBt('error')
      setErrorImpresionBt(err?.message || 'No se pudo imprimir en el T50M.')
    }
  }

  const descargar = async () => {
    if (!etiquetaRef.current) return
    setDescargando(true)
    try {
      const canvas = await html2canvas(etiquetaRef.current, { backgroundColor: '#ffffff' })
      const link = document.createElement('a')
      link.download = `etiqueta-${vista}-${producto.codigo}.png`
      link.href = canvas.toDataURL('image/png')
      // Safari/iOS no dispara la descarga de forma confiable si el <a> no está en el DOM.
      document.body.appendChild(link)
      link.click()
      link.remove()
    } finally {
      setDescargando(false)
    }
  }

  const listoParaDescargar = vista === 'qr' ? Boolean(qrDataUrl) : Boolean(barcodeDataUrl)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-[scaleIn_0.15s_ease-out] rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="mb-4 text-center text-lg font-bold text-text">
          {vista === 'qr' ? 'Etiqueta QR' : 'Etiqueta de código de barras'} para imprimir
        </h2>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setVista('qr')}
            style={{ minHeight: '44px' }}
            className={`flex-1 rounded-xl border px-3 text-sm font-semibold transition ${
              vista === 'qr'
                ? 'border-accent bg-accent text-highlight'
                : 'border-border text-text-secondary hover:border-text-secondary hover:text-text'
            }`}
          >
            🔳 QR
          </button>
          <button
            type="button"
            onClick={() => setVista('barras')}
            style={{ minHeight: '44px' }}
            className={`flex-1 rounded-xl border px-3 text-sm font-semibold transition ${
              vista === 'barras'
                ? 'border-accent bg-accent text-highlight'
                : 'border-border text-text-secondary hover:border-text-secondary hover:text-text'
            }`}
          >
            📊 Barras
          </button>
        </div>

        <div ref={etiquetaRef} className="flex flex-col items-center gap-3 rounded-xl bg-white p-6">
          {vista === 'qr' ? (
            qrDataUrl ? (
              <img src={qrDataUrl} alt={`Código QR de ${producto.codigo}`} className="h-40 w-40" />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center text-sm text-black/50">Generando…</div>
            )
          ) : barcodeDataUrl ? (
            <img src={barcodeDataUrl} alt={`Código de barras de ${producto.codigo}`} className="h-20 w-full max-w-[260px]" />
          ) : (
            <div className="flex h-20 w-full max-w-[260px] items-center justify-center text-sm text-black/50">Generando…</div>
          )}
          <p className="font-mono text-2xl font-bold text-black">{producto.codigo}</p>
          <p className="text-center text-sm text-black/70">{producto.descripcion}</p>
          {ubicacionLabel && (
            <p className="text-center text-xs font-semibold text-black/60">
              {UBICACION_ICONS[ubicacionNombre] ?? '📍'} {ubicacionLabel}
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCerrar}
            style={{ minHeight: '52px' }}
            className="flex-1 rounded-xl border border-border text-text-secondary transition hover:border-text-secondary hover:text-text"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={descargar}
            disabled={!listoParaDescargar || descargando}
            style={{ minHeight: '52px' }}
            className="flex-1 rounded-xl bg-accent font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
          >
            {descargando ? 'Descargando…' : '⬇️ Descargar etiqueta'}
          </button>
        </div>

        {soportaImpresionBluetooth() && (
          <>
            <button
              type="button"
              onClick={imprimirEnT50M}
              disabled={Boolean(estadoImpresionBt) && estadoImpresionBt !== 'error'}
              style={{ minHeight: '48px' }}
              className="mt-3 w-full rounded-xl border border-dashed border-accent text-sm font-semibold text-highlight transition hover:bg-bg disabled:opacity-50"
            >
              {estadoImpresionBt && estadoImpresionBt !== 'error'
                ? ESTADO_LABELS[estadoImpresionBt]
                : '🖨️ Imprimir en T50M (Bluetooth) — experimental'}
            </button>
            {estadoImpresionBt === 'error' && (
              <p className="mt-2 text-center text-xs text-error">{errorImpresionBt}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
