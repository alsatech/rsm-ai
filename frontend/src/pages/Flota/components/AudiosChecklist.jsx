import { useEffect, useRef, useState } from 'react'

// Reproductor de un solo audio (estilo WhatsApp): botón play/stop + tiempo.
function ReproductorAudio({ src, duracionSegundos }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [actual, setActual] = useState(0)
  const [duracionReal, setDuracionReal] = useState(duracionSegundos || 0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      setActual(audio.currentTime)
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuracionReal(audio.duration)
        setProgreso((audio.currentTime / audio.duration) * 100)
      }
    }
    const onLoaded = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuracionReal(audio.duration)
      }
    }
    const onEnd = () => {
      setPlaying(false)
      setProgreso(0)
      setActual(0)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnd)
    }
  }, [src])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }

  const fmt = (s) => {
    if (!Number.isFinite(s) || s < 0) s = 0
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(Math.floor(s % 60)).padStart(2, '0')
    return `${mm}:${ss}`
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-accent/15 px-3 py-2">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pausar audio' : 'Reproducir audio'}
        style={{ minWidth: '44px', minHeight: '44px' }}
        className="flex shrink-0 items-center justify-center rounded-full bg-accent text-xl text-white transition hover:brightness-110 active:scale-95"
      >
        {playing ? '⏸' : '▶️'}
      </button>
      <div className="flex-1">
        <div className="relative h-1.5 overflow-hidden rounded-full bg-flotafg-muted/30">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-100"
            style={{ width: `${progreso}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-flotafg-muted">
          <span>{fmt(actual)}</span>
          <span>{fmt(duracionReal)}</span>
        </div>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  )
}

export default function AudiosChecklist({ audios, onEliminar }) {
  if (!audios?.length) return null
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-flotafg-muted">
        🎙️ Notas de voz ({audios.length})
      </p>
      {audios.map((a, i) => {
        const idx = audios.findIndex((x) => x === a)
        return (
          <div key={a.id ?? a.preview ?? i} className="flex items-center gap-2">
            <div className="flex-1">
              <ReproductorAudio src={a.url ?? a.preview} duracionSegundos={a.duracion_segundos} />
            </div>
            {onEliminar && (
              <button
                type="button"
                onClick={() => onEliminar(idx)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-flotacard/80 text-error transition hover:bg-flotacard"
                aria-label="Eliminar audio"
              >
                ✕
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
