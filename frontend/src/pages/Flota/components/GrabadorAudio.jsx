import { useEffect, useRef, useState } from 'react'

// Grabador de audio push-to-talk estilo WhatsApp.
//
// Comportamiento:
//   - onPressStart: empieza a grabar (botón rojo mientras graba).
//   - onPressEnd:   termina la grabación, llama a onAudioListo(blob, duracionSeg).
//   - Soporta cancelar arrastrando el dedo/dpi hacia abajo.
//
// Props:
//   - onAudioListo(blob, duracionSeg): callback cuando el usuario suelta.
//   - disabled: desactiva el botón.
export default function GrabadorAudio({ onAudioListo, disabled }) {
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [cancelado, setCancelado] = useState(false)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const startTimeRef = useRef(null)
  const intervalRef = useRef(null)
  const canceladoRef = useRef(false)
  // Umbral: si el usuario se mueve más de 60px hacia abajo mientras graba, se cancela.
  const startYRef = useRef(null)
  const CANCEL_THRESHOLD = 60

  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
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
    if (disabled || grabando) return
    setError(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Tu navegador no soporta grabación de audio.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Intentamos un mimeType compatible; fallback a default.
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
        // Extensión según tipo
        const ext = tipo.includes('mp4') ? 'm4a' : tipo.includes('ogg') ? 'ogg' : 'webm'
        const archivo = new File([blob], `nota-${Date.now()}.${ext}`, { type: tipo })

        cleanup()
        setGrabando(false)
        if (!canceladoRef.current && blob.size > 0) {
          onAudioListo?.(archivo, duracion)
        }
      }

      recorder.start()
      startTimeRef.current = Date.now()
      setGrabando(true)
      intervalRef.current = setInterval(() => {
        setSegundos(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 200)
    } catch (e) {
      setError(e?.message ?? 'No se pudo acceder al micrófono.')
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

  // Touch handlers para soporte de arrastrar-para-cancelar en móvil.
  const onTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY
    empezar()
  }
  const onTouchMove = (e) => {
    if (startYRef.current == null) return
    const delta = startYRef.current - e.touches[0].clientY
    if (delta > CANCEL_THRESHOLD) setCancelado(true)
    else setCancelado(false)
  }
  const onTouchEnd = () => {
    startYRef.current = null
    if (canceladoRef.current) cancelar()
    else terminar()
  }

  const formato = (s) => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        // Mouse/desktop: clic inicia, soltar el clic termina.
        onMouseDown={empezar}
        onMouseUp={terminar}
        onMouseLeave={() => grabando && !cancelado && terminar()}
        // Touch/móvil
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        disabled={disabled}
        aria-label={grabando ? 'Grabando, suelta para enviar' : 'Mantén presionado para grabar audio'}
        style={{ minWidth: '64px', minHeight: '64px' }}
        className={`relative flex items-center justify-center rounded-full text-2xl text-white shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
          cancelado
            ? 'bg-flotafg-muted'
            : grabando
              ? 'flota-pulse bg-error'
              : 'bg-error hover:brightness-110'
        }`}
      >
        {cancelado ? '✕' : grabando ? '⏹' : '🎙️'}
      </button>
      <p className="max-w-[140px] text-center text-[11px] font-semibold text-flotafg-muted">
        {error
          ? error
          : grabando
            ? cancelado
              ? 'Suelta para cancelar'
              : `Grabando ${formato(segundos)} — suelta para enviar`
            : 'Mantén presionado para mandar un audio'}
      </p>
    </div>
  )
}
