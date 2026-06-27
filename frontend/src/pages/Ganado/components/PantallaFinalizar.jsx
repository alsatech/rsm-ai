import { useRef, useState } from 'react'

import { finalizarRecorrido, subirFotoRecorrido } from '../../../api/ganado'
import { useToast } from '../../../hooks/useToast'
import { COLOR_LABELS, COLOR_MAP, ESTADO_CONFIG } from './colorConfig'

const MAX_FOTOS = 4
const COLORES = Object.keys(COLOR_MAP)
const ESTADOS = ['bien', 'alerta', 'critico']

export default function PantallaFinalizar({ recorridoId, colorInicial, onVolver, onGuardado }) {
  const { showToast } = useToast()
  const inputRef = useRef(null)

  const [estadoHato, setEstadoHato] = useState('')
  const [narrativa, setNarrativa] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [numeroCabezas, setNumeroCabezas] = useState('')
  const [color, setColor] = useState(colorInicial ?? 'azul_claro')
  const [fotos, setFotos] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleFile = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const disponibles = MAX_FOTOS - fotos.length
    files.slice(0, disponibles).forEach((file) => {
      setFotos((prev) => [...prev, { file, preview: URL.createObjectURL(file) }])
    })
    e.target.value = ''
  }

  const handleGuardar = async () => {
    setErrorMsg('')
    if (!estadoHato) {
      setErrorMsg('Selecciona el estado del hato.')
      return
    }
    if (!narrativa.trim()) {
      setErrorMsg('La narrativa es requerida.')
      return
    }

    setGuardando(true)
    try {
      await finalizarRecorrido(recorridoId, {
        estado_hato: estadoHato,
        narrativa: narrativa.trim(),
        observaciones: observaciones.trim(),
        numero_cabezas: numeroCabezas ? parseInt(numeroCabezas) : null,
        color,
      })

      for (const f of fotos) {
        const fd = new FormData()
        fd.append('foto', f.file)
        await subirFotoRecorrido(recorridoId, fd)
      }

      showToast('Recorrido guardado correctamente.', 'exito')
      onGuardado()
    } catch (err) {
      const data = err?.response?.data
      let msg = 'Error al guardar el recorrido.'
      if (data) {
        if (typeof data === 'string') msg = data
        else if (data.detail) msg = data.detail
        else {
          const campo = Object.keys(data)[0]
          const error = data[campo]
          msg = Array.isArray(error) ? `${campo}: ${error[0]}` : msg
        }
      }
      setErrorMsg(msg)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-svh bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="font-bold text-highlight">Finalizar recorrido</h1>
            <p className="text-xs text-text-secondary">Estado del hato y narrativa</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {errorMsg && (
          <div className="rounded-xl border border-error bg-card px-4 py-3 text-sm text-error">
            {errorMsg}
          </div>
        )}

        {/* Estado del hato */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-secondary">
            Estado del hato <span className="text-error">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {ESTADOS.map((e) => {
              const cfg = ESTADO_CONFIG[e]
              const activo = estadoHato === e
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEstadoHato(e)}
                  className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl border-2 px-2 py-3 text-sm font-semibold transition ${
                    activo
                      ? `${cfg.border} ${cfg.text} bg-card`
                      : 'border-border text-text-secondary hover:border-accent'
                  }`}
                >
                  <span className="mb-1 text-xl">{cfg.icon}</span>
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Número de cabezas */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            Número de cabezas <span className="text-xs opacity-60">(opcional)</span>
          </label>
          <input
            type="number"
            min="0"
            value={numeroCabezas}
            onChange={(e) => setNumeroCabezas(e.target.value)}
            placeholder="Ej: 45"
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-text focus:border-highlight focus:outline-none"
          />
        </div>

        {/* Color */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-secondary">
            Color del recorrido
          </label>
          <div className="flex flex-wrap gap-3">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                title={COLOR_LABELS[c]}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                  color === c ? 'border-text scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: COLOR_MAP[c] }}
              >
                {color === c && <span className="text-sm font-bold text-bg">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Narrativa */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            Narrativa <span className="text-error">*</span>
          </label>
          <textarea
            value={narrativa}
            onChange={(e) => setNarrativa(e.target.value)}
            rows={4}
            placeholder="¿Qué pasó en el recorrido?"
            className="w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm text-text placeholder-text-secondary focus:border-highlight focus:outline-none"
          />
        </div>

        {/* Observaciones */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            Observaciones <span className="text-xs opacity-60">(opcional)</span>
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            placeholder="Novedades, incidencias, etc."
            className="w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm text-text placeholder-text-secondary focus:border-highlight focus:outline-none"
          />
        </div>

        {/* Fotos */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-secondary">
            Fotos <span className="text-xs opacity-60">(opcional, máx. {MAX_FOTOS})</span>
          </label>
          {fotos.length < MAX_FOTOS && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="camera"
                multiple
                className="hidden"
                onChange={handleFile}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-accent py-4 text-sm font-semibold text-highlight transition hover:bg-card"
              >
                <span className="text-xl">📷</span> Tomar foto
              </button>
            </>
          )}
          {fotos.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {fotos.map((f, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-border">
                  <img src={f.preview} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-bg/80 text-error hover:bg-bg"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-1 text-center text-xs text-text-secondary">{fotos.length}/{MAX_FOTOS}</p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg px-4 py-4">
        <button
          type="button"
          onClick={handleGuardar}
          disabled={guardando}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-5 text-lg font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
        >
          {guardando ? (
            <><span className="animate-spin">⏳</span> Guardando...</>
          ) : (
            '✅ Guardar recorrido'
          )}
        </button>
      </div>
      <div className="h-28" />
    </div>
  )
}
