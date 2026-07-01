import { useRef, useState } from 'react'

import { finalizarRecorrido, subirFotoRecorrido } from '../../../api/ganado'
import { limpiarRecorridoLocal } from '../../../api/ganadoOffline'
import { useToast } from '../../../hooks/useToast'
import { COLOR_LABELS, COLOR_MAP, ESTADO_CONFIG } from './colorConfig'

const MAX_FOTOS = 4
const COLORES = Object.keys(COLOR_MAP)
const ESTADOS = ['bien', 'alerta', 'critico']

export default function PantallaFinalizar({ recorridoLocal, onVolver, onGuardado }) {
  const { showToast } = useToast()
  const inputRef = useRef(null)
  const recorridoId = recorridoLocal?.id

  const [estadoHato, setEstadoHato] = useState('')
  const [narrativa, setNarrativa] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [numeroCabezas, setNumeroCabezas] = useState('')
  const [color, setColor] = useState(recorridoLocal?.color ?? 'azul_claro')
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
    if (!recorridoId) { setErrorMsg('El recorrido aún no se ha sincronizado. Espera a tener señal.'); return }
    if (!estadoHato) { setErrorMsg('Selecciona cómo está el ganado.'); return }
    if (!narrativa.trim()) { setErrorMsg('Cuéntanos qué pasó en el recorrido.'); return }

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
      limpiarRecorridoLocal()
      showToast('✅ Recorrido guardado correctamente.', 'exito')
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
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-xl text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-highlight">Cerrar recorrido</h1>
            <p className="text-sm text-text-secondary">Últimos datos antes de guardar</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-8">
        {errorMsg && (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-error bg-card px-4 py-4 text-base font-semibold text-error">
            <span className="text-2xl">⚠️</span> {errorMsg}
          </div>
        )}

        {/* Estado del hato — SECCIÓN MÁS IMPORTANTE */}
        <div>
          <label className="mb-4 block text-lg font-bold text-text">
            ¿Cómo está el ganado? <span className="text-error">*</span>
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
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-5 transition ${
                    activo
                      ? `${cfg.border} bg-card scale-105`
                      : 'border-border hover:border-accent'
                  }`}
                >
                  <span className="text-4xl">{cfg.icon}</span>
                  <span className={`text-base font-bold ${activo ? cfg.text : 'text-text-secondary'}`}>
                    {cfg.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Número de cabezas */}
        <div>
          <label className="mb-2 block text-base font-bold text-text">
            🐄 ¿Cuántas cabezas? <span className="text-sm font-normal text-text-secondary">(opcional)</span>
          </label>
          <input
            type="number"
            min="0"
            value={numeroCabezas}
            onChange={(e) => setNumeroCabezas(e.target.value)}
            placeholder="Ej: 45"
            className="w-full rounded-xl border-2 border-border bg-card px-4 py-4 text-xl font-bold text-text focus:border-highlight focus:outline-none"
          />
        </div>

        {/* Narrativa */}
        <div>
          <label className="mb-2 block text-base font-bold text-text">
            📝 ¿Qué pasó en el recorrido? <span className="text-error">*</span>
          </label>
          <textarea
            value={narrativa}
            onChange={(e) => setNarrativa(e.target.value)}
            rows={5}
            placeholder="Ej: Salieron de los corrales nuevos al callejón y de ahí al aguaje norte. El ganado está tranquilo..."
            className="w-full resize-none rounded-xl border-2 border-border bg-card px-4 py-4 text-base text-text placeholder-text-secondary/60 focus:border-highlight focus:outline-none"
          />
        </div>

        {/* Observaciones */}
        <div>
          <label className="mb-2 block text-base font-bold text-text">
            📌 Observaciones <span className="text-sm font-normal text-text-secondary">(opcional)</span>
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            placeholder="Novedades, fallas, incidencias..."
            className="w-full resize-none rounded-xl border-2 border-border bg-card px-4 py-4 text-base text-text placeholder-text-secondary/60 focus:border-highlight focus:outline-none"
          />
        </div>

        {/* Color */}
        <div>
          <label className="mb-3 block text-base font-bold text-text">
            🎨 Color del recorrido
          </label>
          <div className="flex flex-wrap gap-3">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                title={COLOR_LABELS[c]}
                className={`flex h-12 w-12 items-center justify-center rounded-full border-4 transition ${
                  color === c ? 'border-highlight scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: COLOR_MAP[c] }}
              >
                {color === c && <span className="text-lg font-bold text-bg">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Fotos */}
        <div>
          <label className="mb-3 block text-base font-bold text-text">
            📷 Fotos <span className="text-sm font-normal text-text-secondary">(opcional, máx. {MAX_FOTOS})</span>
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
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-accent py-5 text-lg font-bold text-highlight transition hover:bg-card"
              >
                <span className="text-3xl">📷</span> Tomar foto
              </button>
            </>
          )}
          {fotos.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {fotos.map((f, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-2xl border-2 border-border">
                  <img src={f.preview} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-bg/90 text-lg text-error"
                  >
                    ✕
                  </button>
                  <span className="absolute bottom-2 left-2 rounded-lg bg-bg/80 px-2 py-0.5 font-mono text-sm font-bold text-highlight">
                    {i + 1}/{MAX_FOTOS}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Botón guardar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg px-4 py-5">
        <button
          type="button"
          onClick={handleGuardar}
          disabled={guardando}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-highlight py-5 text-xl font-bold text-bg transition hover:opacity-90 disabled:opacity-50"
        >
          {guardando
            ? <><span className="animate-spin text-2xl">⏳</span> Guardando...</>
            : <><span className="text-2xl">✅</span> Guardar recorrido</>
          }
        </button>
      </div>
      <div className="h-32" />
    </div>
  )
}
