import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

import { imprimirVariasEtiquetasT50M, soportaImpresionBluetooth } from '../../../lib/supvanPrinter'
import { construirPayloadQr } from '../constants'

const ESTADO_LABELS = {
  conectando: 'Conectando…',
  generando_etiqueta: 'Generando etiqueta…',
  imprimiendo: 'Imprimiendo…',
}

// Igual que EtiquetaProducto.jsx pero para imprimir de un jalón todas las etiquetas de una
// ubicación (ej. las ~14 de Granero para la prueba piloto de escaneo) en vez de una por una.
// Usa window.print() con una hoja de estilo @media print en lugar de html2canvas porque son
// varias etiquetas en una hoja, no una sola imagen.
export default function EtiquetasUbicacion({ productos, ubicacionNombre, onCerrar }) {
  const [qrs, setQrs] = useState({})
  const [barcodes, setBarcodes] = useState({})
  const [vista, setVista] = useState('qr') // 'qr' | 'barras'
  const [estadoImpresionBt, setEstadoImpresionBt] = useState(null)
  const [progresoBt, setProgresoBt] = useState(null) // { indice, total, producto }
  const [errorImpresionBt, setErrorImpresionBt] = useState('')

  useEffect(() => {
    let cancelado = false
    Promise.all(
      productos.map((p) =>
        QRCode.toDataURL(construirPayloadQr(p, ubicacionNombre), { width: 220, margin: 1 }).then((url) => [p.id, url]),
      ),
    ).then((pares) => { if (!cancelado) setQrs(Object.fromEntries(pares)) })
    return () => { cancelado = true }
  }, [productos, ubicacionNombre])

  useEffect(() => {
    const pares = productos.map((p) => {
      const canvas = document.createElement('canvas')
      try {
        JsBarcode(canvas, p.codigo, { format: 'CODE128', displayValue: false, width: 2, height: 45, margin: 0 })
        return [p.id, canvas.toDataURL('image/png')]
      } catch {
        return [p.id, null]
      }
    })
    setBarcodes(Object.fromEntries(pares))
  }, [productos])

  const listo = productos.every((p) => qrs[p.id])

  const imprimirEnT50M = async () => {
    setErrorImpresionBt('')
    try {
      await imprimirVariasEtiquetasT50M(productos, (estado, info) => {
        setEstadoImpresionBt(estado)
        setProgresoBt(info)
      }, ubicacionNombre)
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
            <h2 className="font-bold text-text">Etiquetas — {ubicacionNombre}</h2>
            <p className="text-xs text-text-secondary">{productos.length} producto{productos.length !== 1 ? 's' : ''}</p>
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setVista('qr')}
            style={{ minHeight: '40px' }}
            className={`flex-1 rounded-xl border px-3 text-sm font-semibold transition sm:flex-none sm:px-6 ${
              vista === 'qr'
                ? 'border-accent bg-accent text-highlight'
                : 'border-border text-text-secondary hover:border-text-secondary hover:text-text'
            }`}
          >
            🔳 Etiquetas QR
          </button>
          <button
            type="button"
            onClick={() => setVista('barras')}
            style={{ minHeight: '40px' }}
            className={`flex-1 rounded-xl border px-3 text-sm font-semibold transition sm:flex-none sm:px-6 ${
              vista === 'barras'
                ? 'border-accent bg-accent text-highlight'
                : 'border-border text-text-secondary hover:border-text-secondary hover:text-text'
            }`}
          >
            📊 Etiquetas de barras
          </button>
        </div>
      </div>

      {estadoImpresionBt === 'error' && (
        <p className="border-b border-error/40 bg-error/10 px-4 py-2 text-center text-xs text-error print:hidden">
          {errorImpresionBt}
        </p>
      )}

      <div className="flex-1 overflow-y-auto bg-white p-6 print:overflow-visible print:p-0">
        {!listo ? (
          <p className="text-center text-sm text-black/50">Generando etiquetas…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
            {productos.map((p) => (
              <div
                key={p.id}
                className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-4 print:break-inside-avoid print:border"
              >
                {vista === 'qr' ? (
                  <img src={qrs[p.id]} alt={`Código QR de ${p.codigo}`} className="h-28 w-28" />
                ) : (
                  barcodes[p.id] && (
                    <img src={barcodes[p.id]} alt={`Código de barras de ${p.codigo}`} className="h-16 w-full max-w-[200px]" />
                  )
                )}
                <p className="font-mono text-lg font-bold text-black">{p.codigo}</p>
                <p className="text-center text-xs text-black/70">{p.descripcion}</p>
                <p className="text-center text-xs font-semibold text-black/60">📍 {ubicacionNombre}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
