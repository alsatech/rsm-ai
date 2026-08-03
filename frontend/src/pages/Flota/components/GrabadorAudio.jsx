import { useEffect, useRef, useState } from 'react'

// Adjuntar audio a un checklist.
//
// UX ultra-simple (apta para un niño de 6 años):
//   - Tap en el botón rojo → empieza a grabar. El botón se ilumina, aparece un
//     timer grande, vibra (si el dispositivo lo soporta).
//   - Tap otra vez en el botón → para y envía.
//   - Si el navegador no soporta micrófono, aparece un clip para subir un
//     audio ya grabado del dispositivo.
//
// Ambos caminos llaman a onAudioListo(file, duracionSegundos) con la misma firma.

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const OK_EXTS = ['webm', 'ogg', 'mp3', 'm4a', 'wav', 'mp4', 'oga', 'opus']

function getExt(name) {
  if (!name) return ''
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

function clasificarError(e) {
  const msg = (e?.message || e?.name || '').toString().toLowerCase()
  if (
    e?.name === 'NotAllowedError'
    || e?.name === 'PermissionDeniedError'
    || msg.includes('permission')
    || msg.includes('denied')
  ) {
    return 'permiso'
  }
  if (
    e?.name === 'NotFoundError'
    || e?.name === 'OverconstrainedError'
    || msg.includes('not found')
    || msg.includes('no device')
  ) {
    return 'sin-microfono'
  }
  if (msg.includes('secure') || msg.includes('https') || e?.name === 'SecurityError') {
    return 'http'
  }
  return 'otro'
}

function mensajePara(tipo) {
  switch (tipo) {
    case 'permiso':
      return 'Bloqueaste el micrófono. Toca el candado junto a la URL y permite el micrófono.'
    case 'sin-microfono':
      return 'No hay micrófono en este dispositivo. Sube un audio ya grabado.'
    case 'http':
      return 'Tu navegador bloquea el micrófono aquí. Sube un audio ya grabado.'
    default:
      return 'No se pudo grabar. Sube un audio ya grabado.'
  }
}

// ── Sub-grabador tap-to-start/stop ─────────────────────────────────────────────
function GrabadorTap({ onAudioListo, onError }) {
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [errorLocal, setErrorLocal] = useState(null)
  const [preparando, setPreparando] = useState(false)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const startTimeRef = useRef(null)
  const intervalRef = useRef(null)

  const cleanup = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
    startTimeRef.current = null
    setSegundos(0)
  }

  useEffect(() => () => cleanup(), [])

  const empezar = async () => {
    setErrorLocal(null)
    setPreparando(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t))
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const duracion = startTimeRef.current
          ? Math.round((Date.now() - startTimeRef.current) / 1000)
          : 0
        const tipo = recorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: tipo })
        const ext = tipo.includes('mp4') ? 'm4a' : tipo.includes('ogg') ? 'ogg' : 'webm'
        const archivo = new File([blob], `nota-${Date.now()}.${ext}`, { type: tipo })

        cleanup()
        setGrabando(false)
        if (blob.size > 0) onAudioListo?.(archivo, duracion)
      }

      recorder.start()
      startTimeRef.current = Date.now()
      setGrabando(true)
      // Vibración corta como confirmación háptica (móviles que lo soportan).
      if (navigator.vibrate) {
        try { navigator.vibrate(50) } catch { /* ignore */ }
      }
      intervalRef.current = setInterval(() => {
        setSegundos(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 200)
    } catch (e) {
      const tipo = clasificarError(e)
      setErrorLocal(tipo)
      onError?.(tipo, mensajePara(tipo))
      cleanup()
      setGrabando(false)
    } finally {
      setPreparando(false)
    }
  }

  const parar = () => {
    if (navigator.vibrate) {
      try { navigator.vibrate([30, 30, 30]) } catch { /* ignore */ }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const onClickBoton = () => {
    if (preparando) return
    if (grabando) parar()
    else empezar()
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Timer gigante — solo aparece cuando está grabando */}
      {grabando && (
        <div className="flex items-center gap-2 rounded-full bg-error/10 px-4 py-1.5 flota-fade-in">
          <span className="flota-pulse inline-block h-3 w-3 rounded-full bg-error" />
          <span className="font-mono text-2xl font-bold tabular-nums text-error">
            {fmt(segundos)}
          </span>
        </div>
      )}

      {/* Botón redondo grande — el único elemento con el que el usuario interactúa */}
      <button
        type="button"
        onClick={onClickBoton}
        disabled={preparando}
        aria-label={grabando ? 'Toca para parar y enviar' : 'Toca para grabar audio'}
        style={{ width: '88px', height: '88px' }}
        className={`relative flex items-center justify-center rounded-full text-4xl text-white shadow-xl transition active:scale-95 disabled:cursor-wait disabled:opacity-70 ${
          grabando
            ? 'flota-pulse bg-error ring-4 ring-error/30'
            : 'bg-error hover:brightness-110'
        }`}
      >
        {preparando ? '⏳' : grabando ? '⏹' : '🎙️'}
      </button>

      {/* Etiqueta dinámica — cambia sola */}
      <p className="text-center text-base font-bold text-flotafg">
        {errorLocal
          ? mensajePara(errorLocal)
          : grabando
            ? 'Toca para parar'
            : preparando
              ? 'Preparando micrófono…'
              : 'Toca para grabar'}
      </p>
    </div>
  )
}

// ── Subidor de archivo (fallback) ──────────────────────────────────────────────
function SubidorArchivo({ onAudioListo, onError }) {
  const inputRef = useRef(null)

  const handleFiles = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = getExt(file.name)
    if (!OK_EXTS.includes(ext)) {
      onError?.('formato', `Formato "${ext || '?'}" no soportado.`)
      e.target.value = ''
      return
    }
    if (file.size > MAX_BYTES) {
      onError?.('peso', `El audio pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. Máximo 5 MB.`)
      e.target.value = ''
      return
    }
    try {
      const url = URL.createObjectURL(file)
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      audio.src = url
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        onAudioListo?.(file, Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        onAudioListo?.(file, 0)
      }
    } catch {
      onAudioListo?.(file, 0)
    }
    e.target.value = ''
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Subir audio desde tu dispositivo"
        style={{ width: '88px', height: '88px' }}
        className="flex items-center justify-center rounded-full bg-accent text-4xl text-white shadow-xl transition hover:brightness-110 active:scale-95"
      >
        📎
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.m4a,.mp3,.ogg,.wav,.webm,.opus,.oga"
        className="hidden"
        onChange={handleFiles}
      />
      <p className="text-center text-base font-bold text-flotafg">
        Toca para subir un audio
      </p>
    </div>
  )
}

// ── Componente público ────────────────────────────────────────────────────────
export default function GrabadorAudio({ onAudioListo, disabled }) {
  const [soportaGrabar, setSoportaGrabar] = useState(() =>
    Boolean(
      typeof navigator !== 'undefined'
        && navigator.mediaDevices
        && typeof navigator.mediaDevices.getUserMedia === 'function'
        && typeof window !== 'undefined'
        && typeof window.MediaRecorder !== 'undefined'
    )
  )
  const [mensajeError, setMensajeError] = useState(null)
  const [fallbackForzado, setFallbackForzado] = useState(false)

  const handleErrorGrabador = (tipo, mensaje) => {
    if (['permiso', 'http', 'sin-microfono', 'otro'].includes(tipo)) {
      setFallbackForzado(true)
      setMensajeError(mensaje)
    } else {
      setMensajeError(mensaje)
    }
  }

  const mostrarFallback = !soportaGrabar || fallbackForzado

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {mostrarFallback ? (
        <SubidorArchivo onAudioListo={onAudioListo} onError={(t, m) => setMensajeError(m)} />
      ) : (
        <GrabadorTap onAudioListo={onAudioListo} onError={handleErrorGrabador} />
      )}

      {soportaGrabar && (
        <button
          type="button"
          onClick={() => {
            setFallbackForzado((v) => !v)
            setMensajeError(null)
          }}
          className="text-[11px] font-semibold text-accent underline"
        >
          {fallbackForzado ? 'Intentar grabar' : 'No funciona mi micrófono'}
        </button>
      )}

      {mensajeError && (
        <p className="w-full rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          {mensajeError}
        </p>
      )}
    </div>
  )
}