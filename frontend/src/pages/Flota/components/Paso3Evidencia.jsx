import { useRef } from 'react'

const MAX_FOTOS_GENERALES = 6

export default function Paso3Evidencia({ form, setForm, fotos, onAgregarFoto, onEliminarFoto, guardando, onGuardar }) {
  const inputRef = useRef(null)
  const fotosGenerales = fotos
    .map((foto, index) => ({ foto, index }))
    .filter(({ foto }) => !foto.item)

  const handleFile = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const disponibles = MAX_FOTOS_GENERALES - fotosGenerales.length
    files.slice(0, disponibles).forEach((file) => onAgregarFoto('', file))
    e.target.value = ''
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        Agrega hasta {MAX_FOTOS_GENERALES} fotos adicionales del vehículo (opcional).
      </p>

      {fotosGenerales.length < MAX_FOTOS_GENERALES && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-accent py-5 text-base font-semibold text-highlight transition hover:bg-card"
          >
            <span className="text-2xl">📷</span>
            Tomar foto
          </button>
        </>
      )}

      {fotosGenerales.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotosGenerales.map(({ foto, index }, i) => (
            <div key={index} className="relative aspect-square overflow-hidden rounded-xl border border-border">
              <img src={foto.preview} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onEliminarFoto(index)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-bg/80 text-error hover:bg-bg"
              >
                ✕
              </button>
              <span className="absolute bottom-2 left-2 rounded bg-bg/70 px-2 py-0.5 font-mono text-xs text-highlight">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-text-secondary">
        {fotosGenerales.length}/{MAX_FOTOS_GENERALES} fotos
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary" htmlFor="observaciones">
          Observaciones
        </label>
        <textarea
          id="observaciones"
          rows={3}
          value={form.observaciones}
          onChange={(e) => setForm((prev) => ({ ...prev, observaciones: e.target.value }))}
          className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight"
          placeholder="Ej. Falta cruceta, falta aceite, se adjunta foto del tanque vacío de agua y del radiador roto…"
        />
      </div>

      <button
        type="button"
        onClick={onGuardar}
        disabled={guardando}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-base font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
      >
        {guardando ? (
          <>
            <span className="animate-spin">⏳</span> Guardando...
          </>
        ) : (
          '✅ Guardar checklist'
        )}
      </button>
    </div>
  )
}
