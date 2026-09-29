import {
  ESQUEMAS_SERVICIO_BLE,
  PAUSA_ENTRE_FRAGMENTOS_MS,
  TAMANO_FRAGMENTO_BLE,
  TIMEOUT_RESPUESTA_MS,
} from './constants.js'

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function soportaImpresionBluetooth() {
  return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth)
}

// Conecta al T50M por Web Bluetooth, probando los 3 esquemas de servicio/característica
// conocidos en orden hasta que uno responda. Devuelve funciones para enviar un frame de
// comando (fragmentado en bloques de 128 bytes con ~10ms de pausa, esperando el eco de
// respuesta) y para enviar datos crudos en bulk (el raster comprimido), además de desconectar.
export async function conectar() {
  if (!soportaImpresionBluetooth()) {
    throw new Error('Este navegador no soporta Web Bluetooth (usa Chrome/Edge de escritorio o Chrome de Android).')
  }

  const dispositivo = await navigator.bluetooth.requestDevice({
    filters: ESQUEMAS_SERVICIO_BLE.map((esquema) => ({ services: [esquema.servicio] })),
  })
  const servidor = await dispositivo.gatt.connect()

  let caracteristicaEscritura = null
  let caracteristicaNotificacion = null
  for (const esquema of ESQUEMAS_SERVICIO_BLE) {
    try {
      const servicio = await servidor.getPrimaryService(esquema.servicio)
      caracteristicaEscritura = await servicio.getCharacteristic(esquema.escribir)
      caracteristicaNotificacion = esquema.notificar === esquema.escribir
        ? caracteristicaEscritura
        : await servicio.getCharacteristic(esquema.notificar)
      break
    } catch {
      // Este esquema no aplica a este dispositivo — probar el siguiente.
    }
  }

  if (!caracteristicaEscritura || !caracteristicaNotificacion) {
    dispositivo.gatt.disconnect()
    throw new Error('El T50M no expone ninguno de los 3 esquemas de servicio Bluetooth esperados.')
  }

  const pendientes = new Map() // cmd -> { resolve, reject, timeoutId }

  const manejarNotificacion = (evento) => {
    const bytes = new Uint8Array(evento.target.value.buffer)
    if (bytes.length < 8) return
    const cmd = bytes[7]
    const pendiente = pendientes.get(cmd)
    if (!pendiente) return
    clearTimeout(pendiente.timeoutId)
    pendientes.delete(cmd)
    pendiente.resolve(bytes)
  }

  await caracteristicaNotificacion.startNotifications()
  caracteristicaNotificacion.addEventListener('characteristicvaluechanged', manejarNotificacion)

  async function enviarBytesCrudos(bytes) {
    for (let offset = 0; offset < bytes.length; offset += TAMANO_FRAGMENTO_BLE) {
      const fragmento = bytes.slice(offset, offset + TAMANO_FRAGMENTO_BLE)
      await caracteristicaEscritura.writeValueWithResponse(fragmento)
      await esperar(PAUSA_ENTRE_FRAGMENTOS_MS)
    }
  }

  function esperarRespuesta(cmdEsperado) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendientes.delete(cmdEsperado)
        reject(new Error(`El T50M no respondió al comando 0x${cmdEsperado.toString(16)} (timeout).`))
      }, TIMEOUT_RESPUESTA_MS)
      pendientes.set(cmdEsperado, { resolve, reject, timeoutId })
    })
  }

  async function enviarFrame(frame, cmdEsperado) {
    const respuesta = esperarRespuesta(cmdEsperado)
    await enviarBytesCrudos(frame)
    return respuesta
  }

  function desconectar() {
    caracteristicaNotificacion.removeEventListener('characteristicvaluechanged', manejarNotificacion)
    if (dispositivo.gatt.connected) dispositivo.gatt.disconnect()
  }

  return { enviarFrame, enviarBytesCrudos, desconectar }
}
