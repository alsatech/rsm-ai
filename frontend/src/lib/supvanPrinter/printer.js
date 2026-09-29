import { generarRasterEtiqueta } from './bitmap.js'
import { CMD, LARGO_DOTS_DEFAULT, TAMANO_BUFFER_IMPRESION } from './constants.js'
import { construirFrame, parsearEstado } from './frame.js'
import { comprimirParaImpresora } from './lzma.js'
import { conectar } from './transport.js'

const INTENTOS_POLL_IMPRIMIENDO = 100
const PAUSA_POLL_MS = 100

async function esperarFinDeImpresion(conexion) {
  for (let intento = 0; intento < INTENTOS_POLL_IMPRIMIENDO; intento++) {
    const respuesta = await conexion.enviarFrame(construirFrame(CMD.INQUIRY_STA), CMD.INQUIRY_STA)
    const estado = parsearEstado(respuesta)
    if (estado && !estado.printing) return estado
    await new Promise((resolve) => setTimeout(resolve, PAUSA_POLL_MS))
  }
  throw new Error('El T50M se quedó imprimiendo más tiempo del esperado.')
}

async function imprimirUnaEtiqueta(conexion, { codigo, descripcion, ubicacion }, onEstado) {
  await conexion.enviarFrame(construirFrame(CMD.CHECK_DEVICE), CMD.CHECK_DEVICE)

  // RETURN_MAT debería reportar el largo real de la etiqueta cargada, pero los offsets
  // exactos del payload por BLE no están confirmados (ver constants.js) — se envía para
  // seguir la secuencia documentada, pero no se usa su respuesta para dimensionar el
  // raster todavía; si falla, no detiene la impresión.
  try {
    await conexion.enviarFrame(construirFrame(CMD.RETURN_MAT), CMD.RETURN_MAT)
  } catch {
    // Se sigue con el tamaño de etiqueta por default.
  }

  await conexion.enviarFrame(construirFrame(CMD.INQUIRY_STA), CMD.INQUIRY_STA)

  onEstado?.('generando_etiqueta')
  const raster = await generarRasterEtiqueta(codigo, descripcion, ubicacion, LARGO_DOTS_DEFAULT)

  onEstado?.('imprimiendo')
  await conexion.enviarFrame(construirFrame(CMD.START_PRINT), CMD.START_PRINT)

  for (let offset = 0; offset < raster.length; offset += TAMANO_BUFFER_IMPRESION) {
    const bloque = raster.slice(offset, offset + TAMANO_BUFFER_IMPRESION)
    const comprimido = comprimirParaImpresora(bloque)

    await conexion.enviarFrame(
      construirFrame(CMD.NEXT_ZIPPEDBULK, { param: comprimido.length, blockCount: 1 }),
      CMD.NEXT_ZIPPEDBULK,
    )
    // El payload comprimido se manda como datos crudos (no como frame de comando de 16
    // bytes) inmediatamente después del BUF_FULL — el protocolo documenta "framing
    // start-trans + upload bytes raw", interpretado aquí como: se anuncia con BUF_FULL y
    // luego se sube el bloque comprimido completo.
    const respuestaBufFull = conexion.enviarFrame(construirFrame(CMD.BUF_FULL), CMD.BUF_FULL)
    await conexion.enviarBytesCrudos(comprimido)
    await respuestaBufFull
  }

  await esperarFinDeImpresion(conexion)
  await conexion.enviarFrame(construirFrame(CMD.STOP_PRINT), CMD.STOP_PRINT)
}

// Imprime una etiqueta (QR del código + descripción) directo por Bluetooth al T50M.
// EXPERIMENTAL — ver docs de limitaciones en frontend/src/lib/supvanPrinter/. `onEstado`
// recibe: 'conectando' | 'generando_etiqueta' | 'imprimiendo' | 'listo'.
export async function imprimirEtiquetaT50M({ codigo, descripcion, ubicacion }, onEstado) {
  onEstado?.('conectando')
  const conexion = await conectar()
  try {
    await imprimirUnaEtiqueta(conexion, { codigo, descripcion, ubicacion }, onEstado)
    onEstado?.('listo')
  } finally {
    conexion.desconectar()
  }
}

// Igual que imprimirEtiquetaT50M pero para varios productos con UNA sola conexión Bluetooth
// (evita que el navegador pida elegir el dispositivo una vez por cada etiqueta). `onEstado`
// recibe además el índice/total del producto en curso: (estado, { indice, total, producto }).
// `ubicacionLabel` es el texto de la ubicación a imprimir en todas las etiquetas del lote
// (ya viene resuelto por el llamador, ej. "Granero").
export async function imprimirVariasEtiquetasT50M(productos, onEstado, ubicacionLabel) {
  onEstado?.('conectando', { indice: 0, total: productos.length })
  const conexion = await conectar()
  try {
    for (let i = 0; i < productos.length; i++) {
      const producto = productos[i]
      await imprimirUnaEtiqueta(
        conexion,
        { codigo: producto.codigo, descripcion: producto.descripcion, ubicacion: ubicacionLabel },
        (estado) => onEstado?.(estado, { indice: i, total: productos.length, producto }),
      )
    }
    onEstado?.('listo', { indice: productos.length, total: productos.length })
  } finally {
    conexion.desconectar()
  }
}
