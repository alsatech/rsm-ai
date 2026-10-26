import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

import { imprimirEtiquetaT50M, soportaImpresionBluetooth } from '../../../lib/supvanPrinter'
import { UBICACION_ICONS, UBICACION_LABELS, construirPayloadQrGrupo } from '../constants'

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

// Mismo dibujo a mano con Canvas que EtiquetaProducto.jsx (no html2canvas) por la misma razón:
// escanear las hojas de estilo del documento para incrustar la fuente DM Sans se cuelga en
// redes móviles.
async function generarPngEtiqueta({ qrDataUrl, nombre, ubicacionTexto, cantidadMateriales }) {
  const imagen = await cargarImagen(qrDataUrl)
  const ancho = 360
  const margen = 28
  const anchoImagen = 220
  const altoImagen = 220

  const ctxMedir = document.createElement('canvas').getContext('2d')
  ctxMedir.font = 'bold 22px sans-serif'
  const lineasNombre = []
  let actual = ''
  for (const palabra of (nombre || '').split(' ')) {
    const prueba = actual ? `${actual} ${palabra}` : palabra
    if (ctxMedir.measureText(prueba).width > ancho - margen * 2 && actual) {
      lineasNombre.push(actual)
      actual = palabra
    } else {
      actual = prueba
    }
  }
  if (actual) lineasNombre.push(actual)

  const alto = margen + altoImagen + 20 + lineasNombre.length * 28 + 24 + 22 + margen

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
  ctx.font = 'bold 22px sans-serif'
  for (const linea of lineasNombre) {
    ctx.fillText(linea, ancho / 2, y)
    y += 28
  }

  y += 2
  ctx.font = '13px sans-serif'
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.fillText(`${cantidadMateriales} material${cantidadMateriales === 1 ? '' : 'es'}`, ancho / 2, y)

  if (ubicacionTexto) {
    y += 26
    ctx.font = 'bold 12px sans-serif'
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillText(ubicacionTexto, ancho / 2, y)
  }

  return canvas.toDataURL('image/png')
}

// Etiqueta QR de un GRUPO de materiales (varios productos de una misma ubicación agrupados
// bajo un nombre, ej. "Tornillos y tuercas" en Hangar) — a diferencia de EtiquetaProducto, no
// tiene vista de código de barras porque un grupo no es un artículo con SKU propio.
export default function EtiquetaGrupo({ grupo, onCerrar }) {
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [etiquetaPng, setEtiquetaPng] = useState(null)
  const [estadoImpresionBt, setEstadoImpresionBt] = useState(null)
  const [errorImpresionBt, setErrorImpresionBt] = useState('')

  const ubicacionNombre = grupo.ubicacion_detalle?.nombre
  const ubicacionLabel = ubicacionNombre ? UBICACION_LABELS[ubicacionNombre] ?? grupo.ubicacion_detalle?.nombre_display : ''
  const ubicacionTexto = ubicacionLabel ? `${UBICACION_ICONS[ubicacionNombre] ?? '📍'} ${ubicacionLabel}` : ''
  const cantidadMateriales = grupo.productos?.length ?? 0

  useEffect(() => {
    let cancelado = false
    QRCode.toDataURL(construirPayloadQrGrupo(grupo.id, grupo.nombre), { width: 320, margin: 1 })
      .then((url) => { if (!cancelado) setQrDataUrl(url) })
      .catch(() => {})
    return () => { cancelado = true }
  }, [grupo.id, grupo.nombre])

  useEffect(() => {
    if (!qrDataUrl) {
      setEtiquetaPng(null)
      return
    }
    let cancelado = false
    setEtiquetaPng(null)
    generarPngEtiqueta({ qrDataUrl, nombre: grupo.nombre, ubicacionTexto, cantidadMateriales })
      .then((url) => { if (!cancelado) setEtiquetaPng(url) })
      .catch(() => { if (!cancelado) setEtiquetaPng(null) })
    return () => { cancelado = true }
  }, [qrDataUrl, grupo.nombre, ubicacionTexto, cantidadMateriales])

  const imprimirEnT50M = async () => {
    setErrorImpresionBt('')
    try {
      await imprimirEtiquetaT50M(
        { codigo: grupo.nombre, descripcion: `${cantidadMateriales} materiales`, ubicacion: ubicacionLabel },
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
    link.download = `etiqueta-grupo-${grupo.id}.png`
    link.href = etiquetaPng
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
        <h2 className="mb-4 text-center text-lg font-bold text-text print:hidden">Etiqueta QR del grupo</h2>

        <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-6 print:rounded-none print:p-0">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`Código QR del grupo ${grupo.nombre}`} className="h-40 w-40" />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center text-sm text-black/50">Generando…</div>
          )}
          <p className="text-center text-xl font-bold text-black">{grupo.nombre}</p>
          <p className="text-center text-sm text-black/70">
            {cantidadMateriales} material{cantidadMateriales === 1 ? '' : 'es'}
          </p>
          {ubicacionTexto && <p className="text-center text-xs font-semibold text-black/60">{ubicacionTexto}</p>}
        </div>

        <p className="mt-3 text-center text-xs text-text-secondary print:hidden">
          Escanea para ver los materiales de este grupo.
        </p>

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
