import html2canvas from 'html2canvas'
import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'

// Genera una etiqueta con el código QR del producto (a partir de su código actual, ej. SM-001)
// para imprimir y pegar en el bote/anaquel — sin esto, el escáner de SalidaFacil.jsx no tiene
// nada físico que leer todavía.
export default function EtiquetaProducto({ producto, onCerrar }) {
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const etiquetaRef = useRef(null)
  const [descargando, setDescargando] = useState(false)

  useEffect(() => {
    let cancelado = false
    QRCode.toDataURL(producto.codigo, { width: 320, margin: 1 })
      .then((url) => { if (!cancelado) setQrDataUrl(url) })
      .catch(() => {})
    return () => { cancelado = true }
  }, [producto.codigo])

  const descargar = async () => {
    if (!etiquetaRef.current) return
    setDescargando(true)
    try {
      const canvas = await html2canvas(etiquetaRef.current, { backgroundColor: '#ffffff' })
      const link = document.createElement('a')
      link.download = `etiqueta-${producto.codigo}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-[scaleIn_0.15s_ease-out] rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="mb-4 text-center text-lg font-bold text-text">Etiqueta para imprimir</h2>

        <div ref={etiquetaRef} className="flex flex-col items-center gap-3 rounded-xl bg-white p-6">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`Código QR de ${producto.codigo}`} className="h-40 w-40" />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center text-sm text-black/50">Generando…</div>
          )}
          <p className="font-mono text-2xl font-bold text-black">{producto.codigo}</p>
          <p className="text-center text-sm text-black/70">{producto.descripcion}</p>
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
            disabled={!qrDataUrl || descargando}
            style={{ minHeight: '52px' }}
            className="flex-1 rounded-xl bg-accent font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
          >
            {descargando ? 'Descargando…' : '⬇️ Descargar etiqueta'}
          </button>
        </div>
      </div>
    </div>
  )
}
