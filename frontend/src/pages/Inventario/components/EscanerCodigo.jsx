import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'

const REGION_ID = 'escaner-codigo-region'

// Mismo problema que el micrófono en GrabadorAudio.jsx: la cámara solo se deja usar en HTTPS o
// localhost — en HTTP por IP el navegador del celular la bloquea directo. Cuando eso pasa (o no
// hay cámara, o el permiso se negó) no hay nada más que intentar aquí: el respaldo es cerrar y
// escribir el código a mano, que siempre está disponible en la pantalla de atrás.
function mensajeError(e) {
  const msg = (e?.message || e?.name || '').toString().toLowerCase()
  if (e?.name === 'NotAllowedError' || msg.includes('permission') || msg.includes('denied')) {
    return 'Bloqueaste la cámara. Toca el candado junto a la URL y permite la cámara.'
  }
  if (e?.name === 'NotFoundError' || msg.includes('not found')) {
    return 'No encontramos una cámara en este dispositivo.'
  }
  if (msg.includes('secure') || msg.includes('https') || e?.name === 'SecurityError') {
    return 'Tu navegador bloquea la cámara aquí. Escribe el código a mano.'
  }
  return 'No se pudo abrir la cámara. Escribe el código a mano.'
}

export default function EscanerCodigo({ onDetectado, onCerrar }) {
  const [error, setError] = useState(null)
  const scannerRef = useRef(null)
  const detectadoRef = useRef(false)

  useEffect(() => {
    const scanner = new Html5Qrcode(REGION_ID)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (textoDecodificado) => {
          if (detectadoRef.current) return
          detectadoRef.current = true
          if (navigator.vibrate) {
            try { navigator.vibrate(80) } catch { /* ignore */ }
          }
          scanner.stop().then(() => scanner.clear()).catch(() => {}).finally(() => {
            onDetectado(textoDecodificado)
          })
        },
        () => { /* frame sin código legible — normal, no es un error */ },
      )
      .catch((e) => setError(mensajeError(e)))

    return () => {
      if (scanner.getState && scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        scanner.stop().then(() => scanner.clear()).catch(() => {})
      } else {
        scanner.clear().catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-4">
        <p className="text-lg font-bold text-white">📷 Apunta al código</p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar cámara"
          style={{ width: '44px', height: '44px' }}
          className="flex items-center justify-center rounded-full bg-white/10 text-2xl text-white"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        {error ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/5 p-6 text-center">
            <span className="text-5xl">🚫</span>
            <p className="max-w-xs text-base font-semibold text-white">{error}</p>
            <button
              type="button"
              onClick={onCerrar}
              style={{ minHeight: '56px' }}
              className="rounded-xl bg-highlight px-6 text-base font-bold text-bg"
            >
              Cerrar y escribe el código
            </button>
          </div>
        ) : (
          <div id={REGION_ID} className="w-full max-w-sm overflow-hidden rounded-2xl" />
        )}
      </div>
    </div>
  )
}
