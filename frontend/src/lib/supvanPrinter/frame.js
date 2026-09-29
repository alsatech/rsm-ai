import {
  FRAME_DATA_TYPE,
  FRAME_LEN,
  FRAME_MAGIC,
  FRAME_MARKER,
  FRAME_PROTO_ID,
  FRAME_PROTO_VER,
} from './constants.js'

// Frame de comando (16 bytes) — ver docs/PROTOCOL.md de heeen/supvan-cups:
// [0..1] magic 7E 5A · [2..3] payload_len LE (0x000C) · [4] proto_id · [5] proto_ver ·
// [6] marker · [7] CMD · [8..9] checksum (suma LE de bytes [10..16)) · [10] reserved ·
// [11] data_type · [12..13] param LE · [14..15] block_count LE.
export function construirFrame(cmd, { param = 0, blockCount = 0 } = {}) {
  const frame = new Uint8Array(FRAME_LEN)
  frame[0] = FRAME_MAGIC[0]
  frame[1] = FRAME_MAGIC[1]
  frame[2] = 0x0c
  frame[3] = 0x00
  frame[4] = FRAME_PROTO_ID
  frame[5] = FRAME_PROTO_VER
  frame[6] = FRAME_MARKER
  frame[7] = cmd
  // frame[8..9] se llena al final con el checksum
  frame[10] = 0x00
  frame[11] = FRAME_DATA_TYPE
  frame[12] = param & 0xff
  frame[13] = (param >> 8) & 0xff
  frame[14] = blockCount & 0xff
  frame[15] = (blockCount >> 8) & 0xff

  let checksum = 0
  for (let i = 10; i < 16; i++) checksum += frame[i]
  checksum &= 0xffff
  frame[8] = checksum & 0xff
  frame[9] = (checksum >> 8) & 0xff

  return frame
}

// Respuesta: mismo magic, marcador 0x03 0x55, eco del CMD en el byte 7. Se expone el frame
// crudo completo porque el contenido de metadata/payload varía por comando (estado,
// MaterialInfo, etc.) y no todos esos formatos están confirmados para BLE.
export function parsearRespuesta(bytes) {
  if (!bytes || bytes.length < 8) return null
  return { cmd: bytes[7], crudo: bytes }
}

// Bits de estado de INQUIRY_STA (mismas posiciones que Bluetooth Classic, offsets del frame
// completo de 16+ bytes de respuesta).
export function parsearEstado(bytes) {
  if (!bytes || bytes.length < 18) return null
  const mstaLow = bytes[14]
  const mstaHigh = bytes[15]
  const fstaLow = bytes[16]
  const fstaHigh = bytes[17]
  return {
    bufFull: Boolean(mstaLow & 0x01),
    labelRwError: Boolean(mstaLow & 0x02),
    labelEnd: Boolean(mstaLow & 0x04),
    ribbonEnd: Boolean(mstaLow & 0x20),
    lowBattery: Boolean(mstaLow & 0x40),
    deviceBusy: Boolean(mstaHigh & 0x04),
    headTempHigh: Boolean(mstaHigh & 0x08),
    coverOpen: Boolean(fstaLow & 0x08),
    printing: Boolean(fstaLow & 0x40),
    labelNotInstalled: Boolean(fstaHigh & 0x01),
  }
}
