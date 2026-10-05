import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

import { imprimirEtiquetaT50M, soportaImpresionBluetooth } from '../../../lib/supvanPrinter'
import { UBICACION_ICONS, UBICACION_LABELS, construirPayloadQr } from '../constants'

const ESTADO_LABELS = {
  conectando: 'Conectando…',
  generando_etiqueta: 'Generando etiqueta…',
  imprimiendo: 'Imprimiendo…',
}

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function envolverTexto(ctx, texto, anchoMax) {
  const palabras = texto.split(' ')
  const lineas = []
  let actual = ''
  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra
    if (ctx.measureText(prueba).width > anchoMax && actual) {
      lineas.push(actual)
      actual = palabra
    } else {
      actual = prueba
    }
  }
  if (actual) lineas.push(actual)
  return lineas
}

// Dibuja la etiqueta a mano con la API nativa de Canvas en vez de html2canvas: html2canvas
// escanea todas las hojas de estilo del documento (incluida la fuente DM Sans de Google Fonts)
// y en redes móviles ese intento de incrustar la fuente externa puede quedarse colgado para
// siempre — el botón de descarga nunca salía de "Preparando…".
async function generarPngEtiqueta({ imagenUrl, esQr, codigo, descripcion, ubicacionTexto }) {
  const imagen = await cargarImagen(imagenUrl)
  const ancho = 360
  const margen = 28
  const anchoImagen = esQr ? 220 : ancho - margen * 2
  const altoImagen = esQr ? 220 : Math.round((imagen.height / imagen.width) * anchoImagen)

  const ctxMedir = document.createElement('canvas').getContext('2d')
  ctxMedir.font = '14px sans-serif'
  const lineasDescripcion = envolverTexto(ctxMedir, descripcion || '', ancho - margen * 2)

  const alto = margen + altoImagen + 44 + lineasDescripcion.length * 20 + (ubicacionTexto ? 26 : 0) + margen

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ancho, alto)
  ctx.drawImage(imagen, (ancho - anchoImagen) / 2, margen, anchoImagen, altoImagen)

  ctx.textAlign = 'center'
  let y = margen + altoImagen + 32
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 26px sans-serif'
  ctx.fillText(codigo, ancho / 2, y)

  y += 26
  ctx.font = '14px sans-serif'
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  for (const linea of lineasDescripcion) {
    ctx.fillText(linea, ancho / 2, y)
    y += 20
  }

  if (ubicacionTexto) {
    y += 6
    ctx.font = 'bold 12px sans-serif'
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillText(ubicacionTexto, ancho / 2, y)
  }

  return canvas.toDataURL('image/png')
}

// Genera una etiqueta con el código QR del producto (a partir de su código actual, ej. SM-001)
// para imprimir y pegar en el bote/anaquel — sin esto, el escáner de SalidaFacil.jsx no tiene
// nada físico que leer todavía.
export default function EtiquetaProducto({ producto, onCerrar }) {
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [barcodeDataUrl, setBarcodeDataUrl] = useState(null)
  const [vista, setVista] = useState('qr') // 'qr' | 'barras'
  const [etiquetaPng, setEtiquetaPng] = useState(null)
  const [estadoImpresionBt, setEstadoImpresionBt] = useState(null) // null | 'conectando' | ... | 'error'
  const [errorImpresionBt, setErrorImpresionBt] = useState('')

  const ubicacionNombre = producto.ubicacion_detalle?.nombre
  const ubicacionLabel = ubicacionNombre ? UBICACION_LABELS[ubicacionNombre] ?? producto.ubicacion_detalle?.nombre_display : ''
  const ubicacionTexto = ubicacionLabel ? `${UBICACION_ICONS[ubicacionNombre] ?? '📍'} ${ubicacionLabel}` : ''

  useEffect(() => {
    let cancelado = false
    // El QR lleva código + descripción + ubicación empacados (ver construirPayloadQr) para que
    // la app Katasymbol también imprima ese texto al "escanear código", no solo el símbolo.
    QRCode.toDataURL(construirPayloadQr(producto, ubicacionLabel), { width: 320, margin: 1 })
      .then((url) => { if (!cancelado) setQrDataUrl(url) })
      .catch(() => {})
    return () => { cancelado = true }
  }, [producto, ubicacionLabel])

  useEffect(() => {
    const canvas = document.createElement('canvas')
    try {
      JsBarcode(canvas, producto.codigo, { format: 'CODE128', displayValue: false, width: 2, height: 60, margin: 0 })
      setBarcodeDataUrl(canvas.toDataURL('image/png'))
    } catch {
      setBarcodeDataUrl(null)
    }
  }, [producto.codigo])

  // Pre-renderiza el PNG en cuanto la etiqueta esté lista, en vez de esperarlo al dar clic en
  // "Descargar": en Safari/iOS un await antes de link.click() rompe el gesto del usuario y el
  // navegador bloquea la descarga sin avisar nada.
  useEffect(() => {
    const imagenUrl = vista === 'qr' ? qrDataUrl : barcodeDataUrl
    if (!imagenUrl) {
      setEtiquetaPng(null)
      return
    }
    let cancelado = false
    setEtiquetaPng(null)
    generarPngEtiqueta({ imagenUrl, esQr: vista === 'qr', codigo: producto.codigo, descripcion: producto.descripcion, ubicacionTexto })
      .then((url) => { if (!cancelado) setEtiquetaPng(url) })
      .catch(() => { if (!cancelado) setEtiquetaPng(null) })
    return () => { cancelado = true }
  }, [vista, qrDataUrl, barcodeDataUrl, producto.codigo, producto.descripcion, ubicacionTexto])

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

  const descargar = () => {
    if (!etiquetaPng) return
    const link = document.createElement('a')
    link.download = `etiqueta-${vista}-${producto.codigo}.png`
    link.href = etiquetaPng
    // Safari/iOS no dispara la descarga de forma confiable si el <a> no está en el DOM.
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 print:static print:bg-white print:p-0"
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-[scaleIn_0.15s_ease-out] rounded-2xl border border-border bg-card p-5 print:max-w-none print:animate-none print:rounded-none print:border-none print:bg-white print:p-0"
      >
        <h2 className="mb-4 text-center text-lg font-bold text-text print:hidden">
          {vista === 'qr' ? 'Etiqueta QR' : 'Etiqueta de código de barras'} para imprimir
        </h2>

        <div className="mb-4 flex gap-2 print:hidden">
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

        <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-6 print:rounded-none print:p-0">
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
          {ubicacionTexto && <p className="text-center text-xs font-semibold text-black/60">{ubicacionTexto}</p>}
        </div>

        <div className="mt-5 flex gap-3 print:hidden">
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
            disabled={!etiquetaPng}
            style={{ minHeight: '52px' }}
            className="flex-1 rounded-xl bg-accent font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
          >
            {etiquetaPng ? '⬇️ Descargar etiqueta' : 'Preparando…'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          style={{ minHeight: '48px' }}
          className="mt-3 w-full rounded-xl border border-border text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text print:hidden"
        >
          🖨️ Imprimir en hoja
        </button>

        {soportaImpresionBluetooth() && (
          <>
            <button
              type="button"
              onClick={imprimirEnT50M}
              disabled={Boolean(estadoImpresionBt) && estadoImpresionBt !== 'error'}
              style={{ minHeight: '48px' }}
              className="mt-3 w-full rounded-xl border border-dashed border-accent text-sm font-semibold text-highlight transition hover:bg-bg disabled:opacity-50 print:hidden"
            >
              {estadoImpresionBt && estadoImpresionBt !== 'error'
                ? ESTADO_LABELS[estadoImpresionBt]
                : '🖨️ Imprimir en T50M (Bluetooth) — experimental'}
            </button>
            {estadoImpresionBt === 'error' && (
              <p className="mt-2 text-center text-xs text-error print:hidden">{errorImpresionBt}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
