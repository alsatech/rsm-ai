// Protocolo reconstruido por ingeniería inversa del proyecto MIT heeen/supvan-cups
// (https://github.com/heeen/supvan-cups, docs/PROTOCOL.md) — usado como referencia autorizada
// para hablarle a la impresora de etiquetas Bluetooth Katasymbol T50M directo desde el navegador.
// EXPERIMENTAL: no ha sido probado contra un T50M real (ver notas en cada archivo).

// La impresora expone uno de estos 3 esquemas de servicio/característica GATT según el
// firmware — se prueban en este orden hasta que uno responda.
export const ESQUEMAS_SERVICIO_BLE = [
  {
    servicio: '0000fee7-0000-1000-8000-00805f9b34fb',
    escribir: '0000fec1-0000-1000-8000-00805f9b34fb',
    notificar: '0000fec1-0000-1000-8000-00805f9b34fb',
  },
  {
    servicio: '0000e0ff-3c17-d293-8e48-14fe2e4da212',
    escribir: '0000ffe9-0000-1000-8000-00805f9b34fb',
    notificar: '0000ffe1-0000-1000-8000-00805f9b34fb',
  },
  {
    servicio: '0000ff00-0000-1000-8000-00805f9b34fb',
    escribir: '0000ff02-0000-1000-8000-00805f9b34fb',
    notificar: '0000ff01-0000-1000-8000-00805f9b34fb',
  },
]

export const CMD = {
  BUF_FULL: 0x10,
  INQUIRY_STA: 0x11,
  CHECK_DEVICE: 0x12,
  START_PRINT: 0x13,
  STOP_PRINT: 0x14,
  RETURN_MAT: 0x30,
  NEXT_ZIPPEDBULK: 0x5c,
}

// Cabecera fija del frame de comando (16 bytes), igual para Bluetooth Classic y BLE — BLE
// solo cambia el transporte (fragmentado en TAMANO_FRAGMENTO_BLE bytes), no el formato.
export const FRAME_MAGIC = [0x7e, 0x5a]
export const FRAME_PROTO_ID = 0x10
export const FRAME_PROTO_VER = 0x01
export const FRAME_MARKER = 0xaa
export const FRAME_DATA_TYPE = 0x01
export const FRAME_LEN = 16

export const TAMANO_FRAGMENTO_BLE = 128
export const PAUSA_ENTRE_FRAGMENTOS_MS = 10
export const TIMEOUT_RESPUESTA_MS = 4000

// Tamaño de buffer de impresión del firmware — cada bloque de raster se comprime por
// separado antes de subirlo (NEXT_ZIPPEDBULK + BUF_FULL).
export const TAMANO_BUFFER_IMPRESION = 4096

// Cabezal de impresión fijo a 48mm de ancho (8 dots/mm = 203 DPI) — confirmado contra
// crates/supvan-proto/tests/pipeline.rs: el canvas SIEMPRE es 384 dots de ancho
// (48 bytes/línea) sin importar el ancho real de la etiqueta cargada; solo el LARGO
// (dirección de avance del rollo) varía según el material.
export const DOTS_POR_MM = 8
export const ANCHO_CABEZAL_MM = 48
export const ANCHO_DOTS = ANCHO_CABEZAL_MM * DOTS_POR_MM // 384

// Largo de etiqueta por default — RETURN_MAT (0x30) debería reportar el largo real del
// material cargado, pero los offsets exactos del payload por BLE no están confirmados en
// la documentación disponible (solo se confirmaron para USB HID). Por ahora se usa un
// tamaño fijo conservador; ajustar aquí si el rollo real es de otra medida.
export const LARGO_MM_DEFAULT = 34
export const LARGO_DOTS_DEFAULT = LARGO_MM_DEFAULT * DOTS_POR_MM // 272
