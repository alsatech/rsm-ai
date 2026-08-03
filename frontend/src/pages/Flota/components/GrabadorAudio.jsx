import { useEffect, useRef, useState } from 'react'

// Adjuntar audio a un checklist.
//
// Estrategia:
//   1. Si MediaRecorder + getUserMedia están disponibles y funcionando, ofrece
//      el botón rojo push-to-talk estilo WhatsApp.
//   2. Si NO están disponibles (navegador sin soporte o contexto HTTP que
//      bloquea el micrófono), muestra un input de archivo normal para subir
//      audios ya grabados desde el dispositivo (Voice Memos en iOS,
//      grabadora en Android, audios de WhatsApp, etc.).
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
  if (
    msg.includes('secure')
    || msg.includes('https')
    || e?.name === 'SecurityError'
  ) {
    return 'http'
  }
  return 'otro'
}

function mensajePara(tipo) {
  switch (tipo) {
    case 'permiso':
      return 'Bloqueaste el micrófono. Toca el candado junto a la URL y permite el micrófono para grabar desde aquí.'
    case 'sin-microfono':
      return 'No se detecta micrófono en este dispositivo. Sube un audio ya grabado desde tu galería.'
    case 'http':
      return 'Tu navegador bloquea el micrófono en conexiones HTTP. Sube un audio ya grabado desde tu galería.'
    default:
      return 'No se pudo acceder al micrófono. Sube un audio ya grabado desde tu galería.'
  }
}

// ── Sub-grabador push-to-talk (interno) ────────────────────────────────────────
function GrabadorPushToTalk({ onAudioListo, onError }) {
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [cancelado, setCancelado] = useState(false)
  const [errorLocal, setErrorLocal] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const startTimeRef = useRef(null)
  const intervalRef = useRef(null)
  const canceladoRef = useRef(false)
  const startYRef = useRef(null)
  const CANCEL_THRESHOLD = 60

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
    setCancelado(false)
    canceladoRef.current = false
  }

  useEffect(() => () => cleanup(), [])

  const empezar = async () => {
    if (grabando) return
    setErrorLocal(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t))
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      canceladoRef.current = false

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
        if (!canceladoRef.current && blob.size > 0) onAudioListo?.(archivo, duracion)
      }

      recorder.start()
      startTimeRef.current = Date.now()
      setGrabando(true)
      intervalRef.current = setInterval(() => {
        setSegundos(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 200)
    } catch (e) {
      const tipo = clasificarError(e)
      setErrorLocal(tipo)
      onError?.(tipo, mensajePara(tipo))
      cleanup()
      setGrabando(false)
    }
  }

  const terminar = () => {
    if (!grabando) return
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const cancelar = () => {
    canceladoRef.current = true
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const onTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY
    empezar()
  }
  const onTouchMove = (e) => {
    if (startYRef.current == null) return
    const delta = startYRef.current - e.touches[0].clientY
    setCancelado(delta > CANCEL_THRESHOLD)
  }
  const onTouchEnd = () => {
    startYRef.current = null
    if (canceladoRef.current) cancelar()
    else terminar()
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onMouseDown={empezar}
        onMouseUp={terminar}
        onMouseLeave={() => grabando && !cancelado && terminar()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        aria-label={grabando ? 'Grabando, suelta para enviar' : 'Mantén presionado para grabar audio'}
        style={{ minWidth: '64px', minHeight: '64px' }}
        className={`relative flex items-center justify-center rounded-full text-2xl text-white shadow-lg transition active:scale-95 ${
          cancelado
            ? 'bg-flotafg-muted'
            : grabando
              ? 'flota-pulse bg-error'
              : 'bg-error hover:brightness-110'
        }`}
      >
        {cancelado ? '✕' : grabando ? '⏹' : '🎙️'}
      </button>
      <p className="max-w-[160px] text-center text-[11px] font-semibold text-flotafg-muted">
        {errorLocal
          ? mensajePara(errorLocal)
          : grabando
            ? cancelado
              ? 'Suelta para cancelar'
              : `Grabando ${fmt(segundos)} — suelta para enviar`
            : 'Mantén presionado para grabar'}
      </p>
    </div>
  )
}

// ── Subidor de archivo (interno) ────────────────────────────────────────────────
function SubidorArchivo({ onAudioListo, onError }) {
  const inputRef = useRef(null)

  const handleFiles = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = getExt(file.name)
    if (!OK_EXTS.includes(ext)) {
      onError?.('formato', `Formato "${ext || '?'}" no soportado. Usa m4a, mp3, ogg, wav, webm u opus.`)
      e.target.value = ''
      return
    }
    if (file.size > MAX_BYTES) {
      onError?.(
        'peso',
        `El audio pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. Máximo 5 MB.`
      )
      e.target.value = ''
      return
    }
    // Tratamos de leer la duración si el navegador lo permite.
    let duracion = 0
    try {
      const url = URL.createObjectURL(file)
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      audio.src = url
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        if (Number.isFinite(audio.duration)) {
          onAudioListo?.(file, Math.round(audio.duration))
        } else {
          onAudioListo?.(file, 0)
        }
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        onAudioListo?.(file, 0)
      }
      return // Esperamos al evento antes de llamar onAudioListo
    } catch {
      duracion = 0
    }
    onAudioListo?.(file, duracion)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Subir audio desde tu dispositivo"
        style={{ minWidth: '64px', minHeight: '64px' }}
        className="flex items-center justify-center rounded-full bg-accent text-2xl text-white shadow-lg transition hover:brightness-110 active:scale-95"
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
      <p className="max-w-[160px] text-center text-[11px] font-semibold text-flotafg-muted">
        Subir audio (m4a, mp3, ogg…)
      </p>
    </div>
  )
}

// ── Componente público ─────────────────────────────────────────────────────────
export default function GrabadorAudio({ onAudioListo, disabled }) {
  // ¿El navegador soporta MediaRecorder + getUserMedia?
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
    // Si el error es de permiso / http / sin micrófono, mostramos fallback.
    if (['permiso', 'http', 'sin-microfono', 'otro'].includes(tipo)) {
      setFallbackForzado(true)
      setMensajeError(mensaje)
    } else {
      setMensajeError(mensaje)
    }
  }

  const mostrarFallback = !soportaGrabar || fallbackForzado

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-3">
        {mostrarFallback ? (
          <SubidorArchivo onAudioListo={onAudioListo} onError={(t, m) => setMensajeError(m)} />
        ) : (
          <GrabadorPushToTalk onAudioListo={onAudioListo} onError={handleErrorGrabador} />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-flotafg">Mandar audio</p>
          <p className="text-xs text-flotafg-muted">
            {mostrarFallback
              ? 'Sube un audio ya grabado (Voice Memos, grabadora, etc.).'
              : 'Mantén presionado el botón rojo para grabar'}
          </p>
        </div>

        {soportaGrabar && !fallbackForzado && (
          <button
            type="button"
            onClick={() => setFallbackForzado(true)}
            className="text-[11px] font-semibold text-accent underline"
          >
            ¿No funciona? Subir archivo
          </button>
        )}
        {fallbackForzado && (
          <button
            type="button"
            onClick={() => {
              setFallbackForzado(false)
              setMensajeError(null)
            }}
            className="text-[11px] font-semibold text-accent underline"
          >
            Intentar grabar
          </button>
        )}
      </div>

      {mensajeError && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] text-warning">
          {mensajeError}
        </p>
      )}
    </div>
  )
}
