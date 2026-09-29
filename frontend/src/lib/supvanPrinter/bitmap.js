import QRCode from 'qrcode'

import { ANCHO_DOTS, LARGO_DOTS_DEFAULT } from './constants.js'

const UMBRAL_LUMINANCIA = 180 // mismo umbral sin dithering que documenta PROTOCOL.md para casos simples

function recortar(texto, maximo) {
  if (!texto) return ''
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto
}

// 1 bit por pixel, MSB primero, empacado en bytes/fila = ancho/8 (48 bytes para 384 dots) —
// confirmado contra crates/supvan-proto/tests/pipeline.rs de heeen/supvan-cups.
function rasterizarCanvas(imageData) {
  const { width, height, data } = imageData
  const bytesPorFila = width / 8
  const raster = new Uint8Array(bytesPorFila * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const luminancia = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]
      if (luminancia < UMBRAL_LUMINANCIA) {
        const byteIndex = y * bytesPorFila + Math.floor(x / 8)
        raster[byteIndex] |= 1 << (7 - (x % 8))
      }
    }
  }
  return raster
}

// Genera el raster 1bpp de una etiqueta con QR + código + descripción + ubicación, del
// tamaño fijo del cabezal (ANCHO_DOTS) por el largo indicado.
export async function generarRasterEtiqueta(codigo, descripcion, ubicacion, largoDots = LARGO_DOTS_DEFAULT) {
  const canvas = document.createElement('canvas')
  canvas.width = ANCHO_DOTS
  canvas.height = largoDots
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const margen = 8
  const qrSize = Math.min(canvas.width, canvas.height) - margen * 2 - 66
  const qrCanvas = document.createElement('canvas')
  await QRCode.toCanvas(qrCanvas, codigo, { width: qrSize, margin: 0 })
  const qrX = (canvas.width - qrSize) / 2
  ctx.drawImage(qrCanvas, qrX, margen)

  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.font = 'bold 20px monospace'
  ctx.fillText(codigo, canvas.width / 2, margen + qrSize + 22)
  if (descripcion) {
    ctx.font = '13px sans-serif'
    ctx.fillText(recortar(descripcion, 26), canvas.width / 2, margen + qrSize + 40)
  }
  if (ubicacion) {
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText(recortar(ubicacion, 26), canvas.width / 2, margen + qrSize + 58)
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return rasterizarCanvas(imageData)
}
